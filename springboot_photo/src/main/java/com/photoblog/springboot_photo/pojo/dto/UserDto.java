package com.photoblog.springboot_photo.pojo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.Length;

public class UserDto {
    private  Integer userId;

    //  验证注解
    @NotBlank(message="用户名不能为空")        //去除空格
    //@NotEmpty
    private String userName;
    @NotBlank(message="密码不能为空")
    @Length(min = 6,max = 12)
    private String passwd;
    @Email(message = "Email的格式不正确")
    private String email;


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

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    @Override
    public String toString() {
        return "UserDto{" +
                "userName='" + userName + '\'' +
                ", passwd='" + passwd + '\'' +
                ", email='" + email + '\'' +
                '}';
    }
}
