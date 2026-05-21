package com.photoblog.springboot_photo.pojo.dto;

import jakarta.validation.constraints.NotBlank;

/** 账号登录：identifier 为用户名或邮箱 */
public class LoginRequest {
    @NotBlank(message = "邮箱或用户名不能为空")
    private String identifier;

    @NotBlank(message = "密码不能为空")
    private String password;

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
