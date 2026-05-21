package com.photoblog.springboot_photo.service.vision;

import com.photoblog.springboot_photo.config.VisionCategoryProperties;
import com.photoblog.springboot_photo.config.VisionCategoryProperties.Provider;
import com.photoblog.springboot_photo.repostity.WorkRepository;
import com.photoblog.springboot_photo.service.WorksFeedRedisCache;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * 使用国内大模型视觉 API 为作品自动打五类标签（替代本地 DJL）。
 */
@Service
public class WorkVisionCategoryService {

    private static final Logger log = LoggerFactory.getLogger(WorkVisionCategoryService.class);
    private static final int MAX_IMAGE_BYTES = 8 * 1024 * 1024;

    private static final List<String> DOUBAO_VISION_MODEL_FALLBACKS =
            List.of(
                    "doubao-seed-1-6-vision-250815",
                    "doubao-1-5-vision-pro-32k-250115",
                    "doubao-1-5-vision-lite-32k-250115");

    private final VisionCategoryProperties visionProperties;
    private final WorkRepository workRepository;
    private final ObjectProvider<WorksFeedRedisCache> worksFeedRedisCacheProvider;

    public WorkVisionCategoryService(
            VisionCategoryProperties visionProperties,
            WorkRepository workRepository,
            ObjectProvider<WorksFeedRedisCache> worksFeedRedisCacheProvider) {
        this.visionProperties = visionProperties;
        this.workRepository = workRepository;
        this.worksFeedRedisCacheProvider = worksFeedRedisCacheProvider;
    }

    public boolean isEnabled() {
        return visionProperties.isEnabled() && hasAnyConfiguredProvider();
    }

    public boolean isAsync() {
        return visionProperties.isAsync();
    }

    public boolean hasAnyConfiguredProvider() {
        for (String id : visionProperties.getProviderOrder()) {
            Provider p = visionProperties.provider(id);
            if (VisionApiKeyResolver.isConfigured(id, p)) {
                return true;
            }
        }
        return false;
    }

    public void classifyAndPersist(Long workId, Path imageFile) {
        classifyAndPersist(workId, imageFile, null, null);
    }

    /**
     * 对磁盘图片做视觉分类并写回 {@code category}；失败时用标题/文案兜底，确保 AI 模式下尽量有标签。
     */
    public void classifyAndPersist(Long workId, Path imageFile, String title, String caption) {
        if (!visionProperties.isEnabled() || workId == null || imageFile == null) {
            return;
        }
        if (!hasAnyConfiguredProvider()) {
            log.error(
                    "vision skip workId={}: 未配置 API Key。请在 application-local.properties 填写 "
                            + "app.vision.providers.doubao.api-key 后重启",
                    workId);
            return;
        }
        String lastRaw = null;
        try {
            if (!Files.isRegularFile(imageFile)) {
                log.warn("vision skip: file missing workId={} path={}", workId, imageFile);
                return;
            }
            long size = Files.size(imageFile);
            if (size == 0L) {
                log.warn("vision skip: empty file workId={}", workId);
                return;
            }
            if (size > MAX_IMAGE_BYTES) {
                log.warn("vision skip: file too large workId={} bytes={}", workId, size);
                return;
            }
            byte[] bytes = Files.readAllBytes(imageFile);
            String mime = probeMime(imageFile);
            String dataUrl = "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(bytes);
            String prompt = WorkCategoryMapper.classificationPrompt();

            List<String> order = visionProperties.getProviderOrder();
            for (String providerId : order) {
                Provider cfg = visionProperties.provider(providerId);
                if (cfg == null || !VisionApiKeyResolver.isConfigured(providerId, cfg)) {
                    continue;
                }
                OpenAiCompatibleVisionClient client =
                        new OpenAiCompatibleVisionClient(providerId, cfg, VisionApiKeyResolver.resolve(providerId, cfg));
                for (String model : modelCandidates(providerId, cfg)) {
                    try {
                        String raw = client.analyzeImage(dataUrl, prompt, model);
                        lastRaw = raw;
                        String category = WorkCategoryMapper.mapModelTextToCategory(raw);
                        if (category != null) {
                            persistResult(workId, providerId, raw, category);
                            log.info(
                                    "vision done workId={} provider={} model={} category={} raw={}",
                                    workId,
                                    providerId,
                                    model,
                                    category,
                                    raw);
                            return;
                        }
                        log.warn(
                                "vision provider={} model={} workId={} unmapped reply={}",
                                providerId,
                                model,
                                workId,
                                truncate(raw, 80));
                    } catch (OpenAiCompatibleVisionClient.VisionProviderException e) {
                        if (e.isFallbackable()) {
                            log.warn(
                                    "vision provider={} model={} workId={} try next: {}",
                                    providerId,
                                    model,
                                    workId,
                                    e.getCause() != null ? e.getCause().getMessage() : e.toString());
                            continue;
                        }
                        log.error("vision provider={} workId={} fatal", providerId, workId, e);
                        break;
                    }
                }
            }
            applyFallbackCategory(workId, title, caption, lastRaw);
        } catch (IOException e) {
            log.error("vision read image failed workId={} path={}", workId, imageFile, e);
            applyFallbackCategory(workId, title, caption, lastRaw);
        } catch (Exception e) {
            log.error("vision classify failed workId={}", workId, e);
            applyFallbackCategory(workId, title, caption, lastRaw);
        }
    }

    private List<String> modelCandidates(String providerId, Provider cfg) {
        Set<String> set = new LinkedHashSet<>();
        if (cfg.getModel() != null && !cfg.getModel().isBlank()) {
            set.add(cfg.getModel().trim());
        }
        if ("doubao".equalsIgnoreCase(providerId)) {
            DOUBAO_VISION_MODEL_FALLBACKS.forEach(set::add);
        }
        return new ArrayList<>(set);
    }

    /** API 全失败或无法解析时：标题/文案 → 默认风景 */
    private void applyFallbackCategory(Long workId, String title, String caption, String lastRaw) {
        String category = WorkCategoryMapper.mapModelTextToCategory(lastRaw);
        if (category == null) {
            category = WorkCategoryMapper.inferFromTitleCaption(title, caption);
        }
        if (category == null) {
            category = "风景";
        }
        persistResult(workId, "fallback", lastRaw != null ? lastRaw : category, category);
        log.warn(
                "vision fallback workId={} category={} (API 未返回有效标签，已用标题/默认兜底)",
                workId,
                category);
    }

    private void persistResult(Long workId, String providerId, String raw, String category) {
        String label = truncate("vision:" + providerId, 255);
        String coarse = truncate(raw != null ? raw : category, 64);
        int updated =
                workRepository.updateAiPrediction(
                        workId,
                        label,
                        1.0,
                        "[]",
                        coarse,
                        1.0,
                        0.0,
                        0.0,
                        0.0,
                        0.0,
                        0.0,
                        0.0,
                        category);
        if (updated == 0) {
            log.warn("vision UPDATE 0 rows workId={}", workId);
        } else {
            WorksFeedRedisCache cache = worksFeedRedisCacheProvider.getIfAvailable();
            if (cache != null) {
                cache.bumpVersion();
            }
        }
    }

    private static String probeMime(Path path) throws IOException {
        String probed = Files.probeContentType(path);
        if (probed != null && !probed.isBlank()) {
            return probed;
        }
        String name = path.getFileName().toString().toLowerCase(Locale.ROOT);
        if (name.endsWith(".png")) {
            return "image/png";
        }
        if (name.endsWith(".webp")) {
            return "image/webp";
        }
        if (name.endsWith(".gif")) {
            return "image/gif";
        }
        return "image/jpeg";
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max);
    }
}
