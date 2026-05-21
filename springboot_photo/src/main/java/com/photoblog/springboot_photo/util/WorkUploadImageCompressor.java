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
 * 仅用于作品上传落盘：主图最长边 ≤1920、列表缩略图 ≤640。
 * 个人主页头像/背景请用 {@link ProfileImageCompressor}，勿共用本类以免背景被压成列表小图规格。
 */
public final class WorkUploadImageCompressor {

    private static final Logger log = LoggerFactory.getLogger(WorkUploadImageCompressor.class);

    /** 主图最长边像素上限（等比缩小，不变形） */
    public static final int MAX_EDGE_PX = 1920;

    /** 列表缩略图最长边（约等于卡片列宽 × DPR 的上限） */
    public static final int THUMB_MAX_EDGE_PX = 640;

    /** 主图 JPEG 质量 0~1 */
    public static final double JPEG_QUALITY = 0.85;

    /** 缩略图 JPEG 质量（可略低以减小体积） */
    public static final double THUMB_JPEG_QUALITY = 0.78;

    private WorkUploadImageCompressor() {}

    /**
     * 与 {@link #compressAndSaveWithThumb(byte[], String, Path, String)} 相同，仅返回主文件名（兼容旧调用）。
     */
    public static String compressAndSave(byte[] fileBytes, String contentType, Path targetDir, String baseNameNoExt)
            throws IOException {
        return compressAndSaveWithThumb(fileBytes, contentType, targetDir, baseNameNoExt).mainFileName();
    }

    /**
     * @param fileBytes     上传文件完整字节
     * @param contentType   小写或任意，内部归一化
     * @param targetDir     已存在的目录（如 users/.../works/2026/05）
     * @param baseNameNoExt 不含扩展名的文件名（如 UUID）
     * @return 主文件名与缩略图文件名（GIF/原样落盘时为 {@code thumbFileName=null}）
     */
    public static SavedWorkImage compressAndSaveWithThumb(
            byte[] fileBytes, String contentType, Path targetDir, String baseNameNoExt) throws IOException {
        String ct = contentType != null ? contentType.toLowerCase(Locale.ROOT) : "";

        if ("image/gif".equals(ct)) {
            String name = baseNameNoExt + ".gif";
            Files.write(targetDir.resolve(name), fileBytes);
            return new SavedWorkImage(name, null);
        }

        if ("image/jpeg".equals(ct) || "image/png".equals(ct)) {
            BufferedImage img;
            try (ByteArrayInputStream in = new ByteArrayInputStream(fileBytes)) {
                img = ImageIO.read(in);
            }
            if (img == null) {
                String name = writeRawFallback(fileBytes, ct, targetDir, baseNameNoExt);
                return new SavedWorkImage(name, null);
            }
            try {
                return writeJpegMainAndThumb(img, targetDir, baseNameNoExt);
            } catch (Exception e) {
                log.warn("JPEG 压缩失败，改为原样写入: {}", e.getMessage());
                String name = writeRawFallback(fileBytes, ct, targetDir, baseNameNoExt);
                return new SavedWorkImage(name, null);
            }
        }

        BufferedImage img;
        try (ByteArrayInputStream in = new ByteArrayInputStream(fileBytes)) {
            img = ImageIO.read(in);
        }
        if (img != null) {
            try {
                return writeJpegMainAndThumb(img, targetDir, baseNameNoExt);
            } catch (Exception e) {
                log.warn("图片压缩失败，改为原样写入: {}", e.getMessage());
            }
        }
        String name = writeRawFallback(fileBytes, ct, targetDir, baseNameNoExt);
        return new SavedWorkImage(name, null);
    }

    private static SavedWorkImage writeJpegMainAndThumb(BufferedImage img, Path targetDir, String baseNameNoExt)
            throws IOException {
        String mainName = baseNameNoExt + ".jpg";
        Path mainOut = targetDir.resolve(mainName);
        Thumbnails.of(img)
                .size(MAX_EDGE_PX, MAX_EDGE_PX)
                .outputFormat("jpg")
                .outputQuality(JPEG_QUALITY)
                .toFile(mainOut.toFile());
        String thumbName = baseNameNoExt + "_thumb.jpg";
        Path thumbOut = targetDir.resolve(thumbName);
        try {
            Thumbnails.of(img)
                    .size(THUMB_MAX_EDGE_PX, THUMB_MAX_EDGE_PX)
                    .outputFormat("jpg")
                    .outputQuality(THUMB_JPEG_QUALITY)
                    .toFile(thumbOut.toFile());
        } catch (Exception e) {
            log.warn("缩略图写入失败，仅保留主图: {}", e.getMessage());
            try {
                Files.deleteIfExists(thumbOut);
            } catch (IOException ignored) {
                // ignore
            }
            return new SavedWorkImage(mainName, null);
        }
        return new SavedWorkImage(mainName, thumbName);
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

    /**
     * 由库中主图相对路径推导缩略图相对路径（与上传写入规则一致）；无法生成时返回 null。
     */
    public static String thumbRelativePathForMain(String mainRelativePath) {
        if (mainRelativePath == null) {
            return null;
        }
        String p = mainRelativePath.replace('\\', '/').trim();
        if (p.isEmpty() || p.contains("..")) {
            return null;
        }
        String lower = p.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".gif")) {
            return null;
        }
        int dot = p.lastIndexOf('.');
        if (dot < 0) {
            return null;
        }
        return p.substring(0, dot) + "_thumb.jpg";
    }

    public record SavedWorkImage(String mainFileName, String thumbFileName) {}
}
