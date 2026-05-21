package com.photoblog.springboot_photo.controller;

import com.photoblog.springboot_photo.pojo.ResponseMessage;
import com.photoblog.springboot_photo.pojo.dto.AuthResponse;
import com.photoblog.springboot_photo.pojo.dto.LoginEmailCodeRequest;
import com.photoblog.springboot_photo.pojo.dto.LoginRequest;
import com.photoblog.springboot_photo.pojo.dto.RegisterRequest;
import com.photoblog.springboot_photo.pojo.dto.SendEmailCodeRequest;
import com.photoblog.springboot_photo.service.AuthService;
import com.photoblog.springboot_photo.service.EmailOtpService;
import com.photoblog.springboot_photo.service.OtpScene;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * 认证接口。方法上使用完整路径 /api/auth/...，避免在部分 Spring Boot 4 + WebMvc 组合下
 * 类级 @RequestMapping 与方法路径拼接后未正确注册映射、请求落入静态资源处理器的问题。
 */
@RestController
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;
    private final EmailOtpService emailOtpService;

    public AuthController(AuthService authService, EmailOtpService emailOtpService) {
        this.authService = authService;
        this.emailOtpService = emailOtpService;
    }

    @PostMapping("/api/auth/register")
    public ResponseMessage<AuthResponse> register(@Valid @RequestBody RegisterRequest body) {
        log.info("POST /api/auth/register userName={}", body.getUserName());
        return ResponseMessage.success(authService.register(body));
    }

    @PostMapping("/api/auth/login")
    public ResponseMessage<AuthResponse> login(@Valid @RequestBody LoginRequest body) {
        log.info("POST /api/auth/login");
        return ResponseMessage.success(authService.login(body));
    }

    /** 防止在浏览器地址栏用 GET 访问时出现「找静态资源」的误导性报错 */
    @GetMapping("/api/auth/email/send-code")
    public ResponseEntity<ResponseMessage<Object>> sendEmailCodeGetNotAllowed() {
        return ResponseEntity.status(405).body(
                new ResponseMessage<>(405, "请使用 POST + JSON 调用本接口（在前端点击「获取验证码」）", null));
    }

    @PostMapping("/api/auth/email/send-code")
    public ResponseMessage<Void> sendEmailCode(@Valid @RequestBody SendEmailCodeRequest body) {
        log.info("POST /api/auth/email/send-code scene={}", body.getScene());
        emailOtpService.sendCode(OtpScene.fromParam(body.getScene()), body.getEmail());
        return ResponseMessage.success();
    }

    @PostMapping("/api/auth/login-email-code")
    public ResponseMessage<AuthResponse> loginEmailCode(@Valid @RequestBody LoginEmailCodeRequest body) {
        log.info("POST /api/auth/login-email-code");
        return ResponseMessage.success(authService.loginByEmailCode(body));
    }
}
