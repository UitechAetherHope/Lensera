package com.photoblog.springboot_photo.pojo.dto;

/**
 * 作品列表/瀑布流专用 DTO：不含 AI TopK 与大量数值字段，避免 JSON 体积与 ORM 字段 hydrate 拖慢接口。
 * 详情与点赞后完整数据仍用 {@link WorkResponse}。
 */
public record WorkListItemResponse(
        Long workId,
        Long authorPublicId,
        String authorName,
        String authorAvatarUrl,
        String title,
        /** 列表展示用截断文案；全文见 {@link WorkResponse} 或详情接口 */
        String caption,
        String category,
        String imagePath,
        String imageUrl,
        /** 列表缩略图完整 URL；null 时用 {@link #imageUrl} */
        String thumbnailUrl,
        int likeCount,
        Boolean likedByMe,
        long createdAtEpochMs) {}
