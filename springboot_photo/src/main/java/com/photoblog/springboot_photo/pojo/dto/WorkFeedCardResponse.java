package com.photoblog.springboot_photo.pojo.dto;

/**
 * 作品流：原页展示/灯箱所需字段；仍不序列化 AI TopK 等大字段（与个人主页列表思路一致，减轻 JSON）。
 */
public record WorkFeedCardResponse(
        Long workId,
        Long authorPublicId,
        String authorName,
        String authorAvatarUrl,
        String title,
        String caption,
        String category,
        String imageUrl,
        /** 瀑布流列表用小图；无文件时（旧数据 / GIF 等）为 null，前端回退 {@link #imageUrl} */
        String thumbnailUrl,
        int likeCount,
        Boolean likedByMe,
        /** 发布时间（毫秒），用于首页推荐封面新鲜度权重 */
        long createdAtEpochMs) {}
