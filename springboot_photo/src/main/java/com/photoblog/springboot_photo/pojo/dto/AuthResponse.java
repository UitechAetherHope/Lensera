package com.photoblog.springboot_photo.pojo.dto;

/** 登录/注册成功后返回给前端的会话信息（不含密码） */
public class AuthResponse {
    private String token;
    private Integer userId;
    /** 对外展示的用户号（≥1_000_000） */
    private Long publicId;
    private String userName;
    private String email;

    public AuthResponse() {
    }

    public AuthResponse(String token, Integer userId, Long publicId, String userName, String email) {
        this.token = token;
        this.userId = userId;
        this.publicId = publicId;
        this.userName = userName;
        this.email = email;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public Long getPublicId() {
        return publicId;
    }

    public void setPublicId(Long publicId) {
        this.publicId = publicId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
