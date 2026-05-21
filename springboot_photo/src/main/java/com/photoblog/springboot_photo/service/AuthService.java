package com.photoblog.springboot_photo.service;

import com.photoblog.springboot_photo.exception.ApiException;
import com.photoblog.springboot_photo.pojo.User;
import com.photoblog.springboot_photo.pojo.dto.AuthResponse;
import com.photoblog.springboot_photo.pojo.dto.LoginEmailCodeRequest;
import com.photoblog.springboot_photo.pojo.dto.LoginRequest;
import com.photoblog.springboot_photo.pojo.dto.RegisterRequest;
import com.photoblog.springboot_photo.repostity.UserReposity;
import com.photoblog.springboot_photo.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    /** 分配对外用户号 public_id（≥1_000_000，单调递增） */
    private final Object publicIdAllocLock = new Object();

    private final UserReposity userReposity;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailOtpService emailOtpService;

    public AuthService(
            UserReposity userReposity,
            BCryptPasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            EmailOtpService emailOtpService) {
        this.userReposity = userReposity;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.emailOtpService = emailOtpService;
    }

    private long nextMonotonicPublicId() {
        long max = userReposity.findMaxPublicId().orElse(999_999L);
        long next = Math.max(max + 1, 1_000_000L);
        while (userReposity.existsByPublicId(next)) {
            next++;
        }
        return next;
    }

    /**
     * 老数据无 public_id 时补发；新注册在写入前已赋值。需在可能并发分配处持有锁。
     */
    @Transactional
    public User assignPublicIdIfMissing(User user) {
        if (user.getPublicId() != null) {
            return user;
        }
        synchronized (publicIdAllocLock) {
            if (user.getPublicId() != null) {
                return user;
            }
            user.setPublicId(nextMonotonicPublicId());
            return userReposity.save(user);
        }
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String userName = req.getUserName().trim();
        String email = req.getEmail().trim().toLowerCase(Locale.ROOT);

        if (!req.getPassword().equals(req.getConfirmPassword())) {
            throw new ApiException(400, "两次输入的密码不一致");
        }

        if (userReposity.findByUserName(userName).isPresent()) {
            log.warn("register rejected: username exists userName={}", userName);
            throw new ApiException(409, "用户名已存在");
        }
        if (userReposity.findByEmail(email).isPresent()) {
            log.warn("register rejected: email exists");
            throw new ApiException(409, "该邮箱已被注册");
        }

        emailOtpService.verifyAndConsume(OtpScene.REGISTER, email, req.getEmailCode());

        User user = new User();
        user.setUserName(userName);
        user.setEmail(email);
        user.setPasswd(passwordEncoder.encode(req.getPassword()));
        final User saved;
        synchronized (publicIdAllocLock) {
            user.setPublicId(nextMonotonicPublicId());
            saved = userReposity.save(user);
        }
        log.info("user registered userId={} publicId={} userName={}", saved.getUserId(), saved.getPublicId(), userName);
        emailOtpService.clearScene(OtpScene.REGISTER, email);

        String token = jwtUtil.createToken(saved.getUserId(), saved.getUserName());
        return new AuthResponse(token, saved.getUserId(), saved.getPublicId(), saved.getUserName(), saved.getEmail());
    }

    public AuthResponse login(LoginRequest req) {
        String q = req.getIdentifier().trim();
        User user = userReposity.findByUserNameOrEmail(q)
                .orElse(null);

        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPasswd())) {
            log.warn("login failed: bad credentials (identifier omitted)");
            throw new ApiException(401, "用户名或密码错误");
        }

        user = assignPublicIdIfMissing(user);
        log.info("user login ok userId={} publicId={}", user.getUserId(), user.getPublicId());
        String token = jwtUtil.createToken(user.getUserId(), user.getUserName());
        return new AuthResponse(token, user.getUserId(), user.getPublicId(), user.getUserName(), user.getEmail());
    }

    /** 邮箱 + 验证码登录（验证码在 Redis，与密码登录二选一） */
    public AuthResponse loginByEmailCode(LoginEmailCodeRequest req) {
        String email = req.getEmail().trim().toLowerCase(Locale.ROOT);
        emailOtpService.verifyAndConsume(OtpScene.LOGIN, email, req.getEmailCode());

        User user = userReposity.findByEmail(email)
                .orElseThrow(() -> new ApiException(400, "该邮箱未注册"));

        user = assignPublicIdIfMissing(user);
        log.info("user login by email code userId={} publicId={}", user.getUserId(), user.getPublicId());
        String token = jwtUtil.createToken(user.getUserId(), user.getUserName());
        return new AuthResponse(token, user.getUserId(), user.getPublicId(), user.getUserName(), user.getEmail());
    }
}
