package com.photoblog.springboot_photo.pojo.dto;

import java.util.List;

/** 作品评论树节点（顶级 + 折叠在下的回复列表） */
public record WorkCommentDto(
        Long commentId,
        Long parentId,
        Long rootId,
        Long authorPublicId,
        String authorName,
        String authorAvatarUrl,
        /** 回复时：被回复者昵称 */
        String replyToAuthorName,
        String body,
        int likeCount,
        Boolean likedByMe,
        long createdAtEpochMs,
        List<WorkCommentDto> replies) {}
