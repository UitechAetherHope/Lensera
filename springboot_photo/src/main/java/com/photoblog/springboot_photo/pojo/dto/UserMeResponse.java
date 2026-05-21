package com.photoblog.springboot_photo.pojo.dto;

/** GET /api/user/me 返回（不含密码） */
public class UserMeResponse {

    private Long publicId;
    private String userName;
    private String email;
    private String avatarUrl;
    private String coverUrl;
    private Double coverFocusX;
    private Double coverFocusY;
    private String bio;

    public UserMeResponse() {
    }

    public UserMeResponse(
            Long publicId,
            String userName,
            String email,
            String avatarUrl,
            String coverUrl,
            Double coverFocusX,
            Double coverFocusY,
            String bio) {
        this.publicId = publicId;
        this.userName = userName;
        this.email = email;
        this.avatarUrl = avatarUrl;
        this.coverUrl = coverUrl;
        this.coverFocusX = coverFocusX;
        this.coverFocusY = coverFocusY;
        this.bio = bio;
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

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getCoverUrl() {
        return coverUrl;
    }

    public void setCoverUrl(String coverUrl) {
        this.coverUrl = coverUrl;
    }

    public Double getCoverFocusX() {
        return coverFocusX;
    }

    public void setCoverFocusX(Double coverFocusX) {
        this.coverFocusX = coverFocusX;
    }

    public Double getCoverFocusY() {
        return coverFocusY;
    }

    public void setCoverFocusY(Double coverFocusY) {
        this.coverFocusY = coverFocusY;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }
}
