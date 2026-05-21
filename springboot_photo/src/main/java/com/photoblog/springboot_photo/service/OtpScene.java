package com.photoblog.springboot_photo.service;

import com.photoblog.springboot_photo.exception.ApiException;

/** 邮箱验证码业务场景 */
public enum OtpScene {
    REGISTER,
    LOGIN;

    public static OtpScene fromParam(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ApiException(400, "scene 不能为空");
        }
        try {
            return OtpScene.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ApiException(400, "scene 只能为 REGISTER 或 LOGIN");
        }
    }
}
