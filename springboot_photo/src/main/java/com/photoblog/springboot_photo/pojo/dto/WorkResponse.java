package com.photoblog.springboot_photo.pojo.dto;

/** 作品列表/详情返回；瀑布流列表优先用 {@link #thumbnailUrl}，灯箱/大图用 {@link #imageUrl} */
public record WorkResponse(
        Long workId,
        Long authorPublicId,
        String authorName,
        /** 作者头像完整 URL，来自 {@code tb_user.avatar_path}；未设置头像时为 null */
        String authorAvatarUrl,
        String title,
        String caption,
        /** 用户上传时选择的手动分类：风景/人物/动物/街拍/静物；未选则为 null */
        String category,
        String imagePath,
        String imageUrl,
        /** 列表/卡片用小图；null 时用 {@link #imageUrl} */
        String thumbnailUrl,
        int likeCount,
        Boolean likedByMe,
        long createdAtEpochMs,
        /** DJL 自动识别 Top1 类名，未识别或未跑完时为 null */
        String aiLabel,
        Double aiScore,
        String aiTopKJson,
        String aiCoarseZh,
        Double aiCoarseScore,
        Double aiFeatAnimal,
        Double aiFeatPortrait,
        Double aiFeatLandscape,
        Double aiFeatStreet,
        Double aiFeatStill,
        Double aiFeatOther
) {
}
