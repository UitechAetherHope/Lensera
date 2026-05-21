package com.photoblog.springboot_photo.util;

import net.coobird.thumbnailator.Thumbnails;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;

/**
 * 个人资料图：与作品 {@link WorkUploadImageCompressor} 分离。
 * 主页背景需要更高分辨率（大屏 hero 约 72% 视窗），不使用作品列表 640px 缩略图规则。
 */
public final class ProfileImageCompressor {

    private static final Logger log = LoggerFactory.getLogger(ProfileImageCompressor.class);

    /** 主页背景最长边（仅缩小过大图，不生成 thumb） */
    public static final int COVER_MAX_EDGE_PX = 3840;

    public static final double COVER_JPEG_QUALITY = 0.92;

    /** 博客正文内嵌图最长边 */
    public static final int BLOG_ASSET_MAX_EDGE_PX = 1920;

    public static final double BLOG_ASSET_JPEG_QUALITY = 0.9;

    /** 头像最长边 */
    public static final int AVATAR_MAX_EDGE_PX = 800;

    public static final double AVATAR_JPEG_QUALITY = 0.88;

    private ProfileImageCompressor() {}

    public static String saveCover(byte[] fileBytes, String contentType, Path targetDir, String baseNameNoExt)
            throws IOException {
        return saveRaster(fileBytes, contentType, targetDir, baseNameNoExt, COVER_MAX_EDGE_PX, COVER_JPEG_QUALITY, true);
    }

    public static String saveAvatar(byte[] fileBytes, String contentType, Path targetDir, String baseNameNoExt)
            throws IOException {
        return saveRaster(
                fileBytes, contentType, targetDir, baseNameNoExt, AVATAR_MAX_EDGE_PX, AVATAR_JPEG_QUALITY, false);
    }

    /** 博客 Markdown 内嵌图：限制最长边，不生成缩略图 */
    public static String saveBlogAsset(byte[] fileBytes, String contentType, Path targetDir, String baseNameNoExt)
            throws IOException {
        return saveRaster(
                fileBytes,
                contentType,
                targetDir,
                baseNameNoExt,
                BLOG_ASSET_MAX_EDGE_PX,
                BLOG_ASSET_JPEG_QUALITY,
                false);
    }

    private static String saveRaster(
            byte[] fileBytes,
            String contentType,
            Path targetDir,
            String baseNameNoExt,
            int maxEdge,
            double jpegQuality,
            boolean cover)
            throws IOException {
        String ct = contentType != null ? contentType.toLowerCase(Locale.ROOT) : "";

        if ("image/gif".equals(ct)) {
            String name = baseNameNoExt + ".gif";
            Files.write(targetDir.resolve(name), fileBytes);
            return name;
        }

        BufferedImage img;
        try (ByteArrayInputStream in = new ByteArrayInputStream(fileBytes)) {
            img = ImageIO.read(in);
        }
        if (img == null) {
            return writeRawFallback(fileBytes, ct, targetDir, baseNameNoExt);
        }

        try {
            String name = baseNameNoExt + ".jpg";
            Thumbnails.of(img)
                    .size(maxEdge, maxEdge)
                    .outputFormat("jpg")
                    .outputQuality(jpegQuality)
                    .toFile(targetDir.resolve(name).toFile());
            return name;
        } catch (Exception e) {
            log.warn("资料图 JPEG 处理失败{}，改为原样: {}", cover ? "(背景)" : "(头像)", e.getMessage());
            return writeRawFallback(fileBytes, ct, targetDir, baseNameNoExt);
        }
    }

    private static String writeRawFallback(byte[] fileBytes, String contentType, Path targetDir, String baseNameNoExt)
            throws IOException {
        String ext =
                switch (contentType) {
                    case "image/jpeg" -> ".jpg";
                    case "image/png" -> ".png";
                    case "image/webp" -> ".webp";
                    case "image/gif" -> ".gif";
                    default -> ".bin";
                };
        String name = baseNameNoExt + ext;
        Files.write(targetDir.resolve(name), fileBytes);
        return name;
    }
}
