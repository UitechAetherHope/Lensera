package com.photoblog.springboot_photo.pojo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class SendEmailCodeRequest {

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;

    /** REGISTER：未注册邮箱；LOGIN：已注册邮箱 */
    @NotBlank(message = "scene 不能为空")
    @Pattern(regexp = "^(REGISTER|LOGIN)$", flags = Pattern.Flag.CASE_INSENSITIVE, message = "scene 只能为 REGISTER 或 LOGIN")
    private String scene;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getScene() {
        return scene;
    }

    public void setScene(String scene) {
        this.scene = scene;
    }
}
