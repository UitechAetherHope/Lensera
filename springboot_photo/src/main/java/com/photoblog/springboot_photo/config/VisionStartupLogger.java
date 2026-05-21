package com.photoblog.springboot_photo.config;

import com.photoblog.springboot_photo.service.vision.WorkVisionCategoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 启动时提示已配置的视觉 API，便于排查「上传无标签」。
 */
@Component
@ConditionalOnProperty(prefix = "app.vision", name = "enabled", havingValue = "true", matchIfMissing = true)
public class VisionStartupLogger implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(VisionStartupLogger.class);

    private final VisionCategoryProperties visionProperties;
    private final WorkVisionCategoryService workVisionCategoryService;

    public VisionStartupLogger(
            VisionCategoryProperties visionProperties, WorkVisionCategoryService workVisionCategoryService) {
        this.visionProperties = visionProperties;
        this.workVisionCategoryService = workVisionCategoryService;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!workVisionCategoryService.isEnabled()) {
            log.warn(
                    "作品 AI 分类：未检测到任何 app.vision.providers.*.api-key。"
                            + "请在 application-local.properties 配置豆包/DeepSeek/通义/智谱密钥后重启");
            return;
        }
        StringBuilder sb = new StringBuilder("作品 AI 分类已启用，调用顺序: ");
        for (String id : visionProperties.getProviderOrder()) {
            VisionCategoryProperties.Provider p = visionProperties.provider(id);
            if (com.photoblog.springboot_photo.service.vision.VisionApiKeyResolver.isConfigured(id, p)) {
                sb.append(id).append('(').append(p.getModel()).append(") → ");
            }
        }
        log.info(sb.substring(0, Math.max(0, sb.length() - 4)));
    }
}
