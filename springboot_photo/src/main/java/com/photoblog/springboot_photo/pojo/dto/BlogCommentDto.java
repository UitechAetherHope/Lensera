package com.photoblog.springboot_photo.pojo.dto;

import java.util.List;

/** 博客评论树节点 */
public record BlogCommentDto(
        Long commentId,
        Long parentId,
        Long rootId,
        Long authorPublicId,
        String authorName,
        String authorAvatarUrl,
        String replyToAuthorName,
        String body,
        int likeCount,
        Boolean likedByMe,
        long createdAtEpochMs,
        List<BlogCommentDto> replies) {}
