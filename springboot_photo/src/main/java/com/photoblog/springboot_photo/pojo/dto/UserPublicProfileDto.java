package com.photoblog.springboot_photo.pojo.dto;

/** 对外用户主页展示（不含邮箱） */
public record UserPublicProfileDto(
        Long publicId,
        String userName,
        long likesReceived,
        long followingCount,
        long followersCount,
        boolean followedByMe,
        String avatarUrl,
        String coverUrl,
        Double coverFocusX,
        Double coverFocusY,
        String bio
) {
}
