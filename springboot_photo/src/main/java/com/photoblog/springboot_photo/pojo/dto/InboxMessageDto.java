package com.photoblog.springboot_photo.pojo.dto;

/**
 * 个人中心「消息」：他人在我的作品/博客下的留言（不含自己回复自己）。
 *
 * @param kind work | blog
 */
public record InboxMessageDto(
        String kind,
        Long commentId,
        Long targetId,
        String targetTitle,
        String targetImageUrl,
        Long authorPublicId,
        String authorName,
        String authorAvatarUrl,
        String bodyPreview,
        long createdAtEpochMs) {}
