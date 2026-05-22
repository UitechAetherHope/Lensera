package com.photoblog.springboot_photo.controller;

import com.photoblog.springboot_photo.exception.ApiException;
import com.photoblog.springboot_photo.pojo.ResponseMessage;
import com.photoblog.springboot_photo.pojo.User;
import com.photoblog.springboot_photo.pojo.dto.UserMeResponse;
import com.photoblog.springboot_photo.repostity.UserReposity;
import com.photoblog.springboot_photo.pojo.dto.InboxMessageDto;
import com.photoblog.springboot_photo.service.AuthService;
import com.photoblog.springboot_photo.service.UserInboxService;
import com.photoblog.springboot_photo.service.UserProfileService;
import com.photoblog.springboot_photo.util.JwtUtil;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
public class UserMeController {

    private final JwtUtil jwtUtil;
    private final UserReposity userReposity;
    private final AuthService authService;
    private final UserProfileService userProfileService;
    private final UserInboxService userInboxService;

    public UserMeController(
            JwtUtil jwtUtil,
            UserReposity userReposity,
            AuthService authService,
            UserProfileService userProfileService,
            UserInboxService userInboxService) {
        this.jwtUtil = jwtUtil;
        this.userReposity = userReposity;
        this.authService = authService;
        this.userProfileService = userProfileService;
        this.userInboxService = userInboxService;
    }

    /** 当前登录用户资料（用户名、对外用户号、邮箱），需 Authorization: Bearer */
    @GetMapping("/api/user/me")
    public ResponseMessage<UserMeResponse> me(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Integer userId = jwtUtil.parseUserIdFromAuthorization(authorization);
        User user = userReposity.findById(userId)
                .orElseThrow(() -> new ApiException(404, "用户不存在"));
        user = authService.assignPublicIdIfMissing(user);
        return ResponseMessage.success(userProfileService.buildMeResponse(user));
    }

    /** 他人在我的作品/博客下的留言（消息中心） */
    @GetMapping("/api/user/me/messages")
    public ResponseMessage<List<InboxMessageDto>> messages(
            @RequestHeader("Authorization") String authorization) {
        Integer userId = jwtUtil.parseUserIdFromAuthorization(authorization);
        return ResponseMessage.success(userInboxService.listIncomingMessages(userId));
    }

    /**
     * 更新个人主页：可选 multipart 字段 userName、avatar、cover；
     * 头像写入 users/{publicId}/avatar/，背景写入 users/{publicId}/background/。
     */
    @PatchMapping(value = "/api/user/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseMessage<UserMeResponse> patchMe(
            @RequestHeader("Authorization") String authorization,
            @RequestParam(value = "userName", required = false) String userName,
            @RequestPart(value = "avatar", required = false) MultipartFile avatar,
            @RequestPart(value = "cover", required = false) MultipartFile cover,
            @RequestParam(value = "coverFocusX", required = false) Double coverFocusX,
            @RequestParam(value = "coverFocusY", required = false) Double coverFocusY,
            @RequestParam(value = "bio", required = false) String bio)
            throws IOException {
        Integer userId = jwtUtil.parseUserIdFromAuthorization(authorization);
        return ResponseMessage.success(
                userProfileService.updateMyProfile(userId, userName, avatar, cover, coverFocusX, coverFocusY, bio));
    }
}
