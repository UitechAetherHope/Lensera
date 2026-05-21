package com.photoblog.springboot_photo.pojo;

import jakarta.persistence.*;

//把用户类映射成表
@Table(name = "tb_user")
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Integer userId;
    @Column(name = "user_name", unique = true, nullable = false, length = 64)
    private String userName;
    @Column(name = "user_passwd")
    private String passwd;
    @Column(name = "user_email", unique = true, nullable = false, length = 128)
    private String email;

    /** 对外展示的用户号（≥1_000_000，与主键 user_id 分离），用于个人主页「ID」等 */
    @Column(name = "public_id", unique = true)
    private Long publicId;

    /** 相对上传根：users/{publicId}/avatar/... */
    @Column(name = "avatar_path", length = 512)
    private String avatarPath;

    /** 相对上传根：users/{publicId}/background/... */
    @Column(name = "cover_path", length = 512)
    private String coverPath;

    /** 背景图 object-position 水平焦点 0–100，拉满时生效 */
    @Column(name = "cover_focus_x")
    private Double coverFocusX = 50.0;

    /** 背景图 object-position 垂直焦点 0–100，拉满时生效 */
    @Column(name = "cover_focus_y")
    private Double coverFocusY = 42.0;

    /** 个人主页签名/简介 */
    @Column(name = "bio", length = 200)
    private String bio;

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getPasswd() {
        return passwd;
    }

    public void setPasswd(String passwd) {
        this.passwd = passwd;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Long getPublicId() {
        return publicId;
    }

    public void setPublicId(Long publicId) {
        this.publicId = publicId;
    }

    public String getAvatarPath() {
        return avatarPath;
    }

    public void setAvatarPath(String avatarPath) {
        this.avatarPath = avatarPath;
    }

    public String getCoverPath() {
        return coverPath;
    }

    public void setCoverPath(String coverPath) {
        this.coverPath = coverPath;
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

    @Override
    public String toString() {
        return "User{" +
                "userId=" + userId +
                ", userName='" + userName + '\'' +
                ", passwd='" + passwd + '\'' +
                ", email='" + email + '\'' +
                ", publicId=" + publicId +
                '}';
    }
}
