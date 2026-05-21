package com.photoblog.springboot_photo.util;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * 本地上传目录约定（相对 {@code app.upload.root}，正斜杠）：
 * <pre>
 *   users/{publicId}/works/{yyyy}/{MM}/           — 摄影作品
 *   users/{publicId}/blog/covers/{yyyy}/{MM}/     — 博客列表卡片封面
 *   users/{publicId}/blog/assets/{yyyy}/{MM}/     — 正文 Markdown 内嵌图
 *   users/{publicId}/avatar/                      — 用户头像
 *   users/{publicId}/background/                — 个人主页背景图
 * </pre>
 */
public final class UserUploadPaths {

    private static final ZoneId ZONE = ZoneId.systemDefault();
    private static final DateTimeFormatter YEAR_MONTH =
            DateTimeFormatter.ofPattern("yyyy/MM").withZone(ZONE);

    private UserUploadPaths() {
    }

    /** {@code users/{publicId}} */
    public static String userRoot(long publicId) {
        return "users/" + publicId;
    }

    /** {@code users/{publicId}/works/{yyyy}/{MM}}，作品按月分目录 */
    public static String worksMonthDirectory(long publicId, Instant when) {
        return userRoot(publicId) + "/works/" + YEAR_MONTH.format(when);
    }

    /** {@code users/{publicId}/avatar}，头像上传后建议文件名带时间戳+随机串 */
    public static String avatarDirectory(long publicId) {
        return userRoot(publicId) + "/avatar";
    }

    /** {@code users/{publicId}/background}，主页背景图 */
    public static String homeBackgroundDirectory(long publicId) {
        return userRoot(publicId) + "/background";
    }

    /** {@code users/{publicId}/blog/covers/{yyyy}/{MM}}，博客卡片封面按月分目录 */
    public static String blogCoversMonthDirectory(long publicId, Instant when) {
        return userRoot(publicId) + "/blog/covers/" + YEAR_MONTH.format(when);
    }

    /** {@code users/{publicId}/blog/assets/{yyyy}/{MM}}，Markdown 正文内嵌图按月分目录 */
    public static String blogAssetsMonthDirectory(long publicId, Instant when) {
        return userRoot(publicId) + "/blog/assets/" + YEAR_MONTH.format(when);
    }

    /** 文件名基底：毫秒时间戳 + 随机串，便于排查与去重 */
    public static String uniqueFileBaseName() {
        return java.time.Instant.now().toEpochMilli()
                + "_"
                + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }
}
