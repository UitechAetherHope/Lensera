package com.photoblog.springboot_photo.controller;

import com.photoblog.springboot_photo.pojo.ResponseMessage;
import com.photoblog.springboot_photo.pojo.dto.UserPublicProfileDto;
import com.photoblog.springboot_photo.service.UserProfileService;
import com.photoblog.springboot_photo.util.JwtUtil;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
public class UserPublicController {

    private final JwtUtil jwtUtil;
    private final UserProfileService userProfileService;

    public UserPublicController(JwtUtil jwtUtil, UserProfileService userProfileService) {
        this.jwtUtil = jwtUtil;
        this.userProfileService = userProfileService;
    }

    /** 公开用户主页数据（可选登录：用于 followedByMe） */
    @GetMapping("/api/users/{publicId}")
    public ResponseMessage<UserPublicProfileDto> getPublicProfile(
            @PathVariable Long publicId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<Integer> viewer = jwtUtil.parseUserIdOptional(authorization);
        return ResponseMessage.success(userProfileService.getPublicProfile(publicId, viewer));
    }

    @PostMapping("/api/users/{publicId}/follow")
    public ResponseMessage<UserPublicProfileDto> follow(
            @PathVariable Long publicId,
            @RequestHeader("Authorization") String authorization) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        return ResponseMessage.success(userProfileService.follow(publicId, uid));
    }

    @DeleteMapping("/api/users/{publicId}/follow")
    public ResponseMessage<UserPublicProfileDto> unfollow(
            @PathVariable Long publicId,
            @RequestHeader("Authorization") String authorization) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        return ResponseMessage.success(userProfileService.unfollow(publicId, uid));
    }
}
