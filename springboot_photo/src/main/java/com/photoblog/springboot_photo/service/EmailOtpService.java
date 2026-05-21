package com.photoblog.springboot_photo.service;

import com.photoblog.springboot_photo.exception.ApiException;
import com.photoblog.springboot_photo.repostity.UserReposity;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * 邮箱验证码：仅存 Redis；验证码 TTL 3 分钟；多次发送时旧码在各自 TTL 内仍有效；
 * 发送冷却 1 分钟（Redis 标记）。
 */
@Service
public class EmailOtpService {

    private static final Logger log = LoggerFactory.getLogger(EmailOtpService.class);
    private static final int OTP_TTL_SEC = 180;
    private static final int COOLDOWN_SEC = 60;
    private static final int CODE_LEN = 6;

    private final StringRedisTemplate redis;
    private final JavaMailSender mailSender;
    private final UserReposity userReposity;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    public EmailOtpService(StringRedisTemplate redis, JavaMailSender mailSender, UserReposity userReposity) {
        this.redis = redis;
        this.mailSender = mailSender;
        this.userReposity = userReposity;
    }

    public void sendCode(OtpScene scene, String emailRaw) {
        if (mailFrom == null || mailFrom.isBlank()) {
            throw new ApiException(500, "未配置发件邮箱 MAIL_USERNAME");
        }
        String email = normalizeEmail(emailRaw);
        String tag = emailTag(email);

        if (scene == OtpScene.REGISTER) {
            if (userReposity.findByEmail(email).isPresent()) {
                throw new ApiException(409, "该邮箱已注册");
            }
        } else {
            if (userReposity.findByEmail(email).isEmpty()) {
                throw new ApiException(400, "该邮箱未注册");
            }
        }

        String cooldownKey = keyCooldown(scene, tag);
        if (Boolean.TRUE.equals(redis.hasKey(cooldownKey))) {
            throw new ApiException(429, "发送过于频繁，请 1 分钟后再试");
        }

        cleanupDeadSlots(scene, tag);

        String code = randomDigits(CODE_LEN);
        String slotId = java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String otpKey = keyOtp(scene, tag, slotId);
        String slotsKey = keySlots(scene, tag);

        redis.opsForValue().set(otpKey, code, OTP_TTL_SEC, TimeUnit.SECONDS);
        redis.opsForSet().add(slotsKey, slotId);
        redis.opsForValue().set(cooldownKey, "1", COOLDOWN_SEC, TimeUnit.SECONDS);

        try {
            sendMail(email, scene, code);
        } catch (MessagingException e) {
            log.error("send mail failed to={}", email, e);
            redis.delete(otpKey);
            redis.opsForSet().remove(slotsKey, slotId);
            redis.delete(cooldownKey);
            throw new ApiException(502, "邮件发送失败，请稍后重试");
        }
        log.info("email otp sent scene={} to={}", scene, email);
    }

    /** 校验并消费匹配的验证码（仅删除命中的那条；其它未过期码仍有效） */
    public void verifyAndConsume(OtpScene scene, String emailRaw, String inputCode) {
        String email = normalizeEmail(emailRaw);
        String tag = emailTag(email);
        String slotsKey = keySlots(scene, tag);
        String expect = inputCode == null ? "" : inputCode.trim();
        if (expect.length() != CODE_LEN) {
            throw new ApiException(400, "验证码须为 6 位数字");
        }

        Set<String> slots = redis.opsForSet().members(slotsKey);
        if (slots == null || slots.isEmpty()) {
            throw new ApiException(400, "验证码无效或已过期");
        }

        for (String slot : slots) {
            String otpKey = keyOtp(scene, tag, slot);
            String stored = redis.opsForValue().get(otpKey);
            if (stored == null) {
                redis.opsForSet().remove(slotsKey, slot);
                continue;
            }
            if (expect.equals(stored)) {
                redis.delete(otpKey);
                redis.opsForSet().remove(slotsKey, slot);
                return;
            }
        }
        throw new ApiException(400, "验证码错误");
    }

    /** 注册成功后清理该邮箱下所有「注册」类验证码 */
    public void clearScene(OtpScene scene, String emailRaw) {
        String tag = emailTag(normalizeEmail(emailRaw));
        String slotsKey = keySlots(scene, tag);
        Set<String> slots = redis.opsForSet().members(slotsKey);
        if (slots != null) {
            for (String slot : slots) {
                redis.delete(keyOtp(scene, tag, slot));
            }
        }
        redis.delete(slotsKey);
    }

    private void cleanupDeadSlots(OtpScene scene, String tag) {
        String slotsKey = keySlots(scene, tag);
        Set<String> slots = redis.opsForSet().members(slotsKey);
        if (slots == null) {
            return;
        }
        for (String slot : slots) {
            if (!Boolean.TRUE.equals(redis.hasKey(keyOtp(scene, tag, slot)))) {
                redis.opsForSet().remove(slotsKey, slot);
            }
        }
    }

    private void sendMail(String to, OtpScene scene, String code) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
        helper.setFrom(mailFrom);
        helper.setTo(to);
        helper.setSubject(scene == OtpScene.REGISTER ? "注册验证码" : "登录验证码");
        String html = "<p>您的验证码为：<b style='font-size:18px'>" + code + "</b></p>"
                + "<p>3 分钟内有效，请勿泄露给他人。</p>";
        helper.setText(html, true);
        mailSender.send(message);
    }

    private static String normalizeEmail(String raw) {
        return raw.trim().toLowerCase(Locale.ROOT);
    }

    /** Redis key 中安全片段（避免特殊字符） */
    private static String emailTag(String normalizedEmail) {
        return Integer.toHexString(normalizedEmail.hashCode())
                + ":" + java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(normalizedEmail.getBytes(StandardCharsets.UTF_8));
    }

    private static String keyCooldown(OtpScene scene, String tag) {
        return "mail:otp:cooldown:" + scene.name() + ":" + tag;
    }

    private static String keySlots(OtpScene scene, String tag) {
        return "mail:otp:slots:" + scene.name() + ":" + tag;
    }

    private static String keyOtp(OtpScene scene, String tag, String slotId) {
        return "mail:otp:code:" + scene.name() + ":" + tag + ":" + slotId;
    }

    private static String randomDigits(int len) {
        SecureRandom r = new SecureRandom();
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) {
            sb.append(r.nextInt(10));
        }
        return sb.toString();
    }
}
