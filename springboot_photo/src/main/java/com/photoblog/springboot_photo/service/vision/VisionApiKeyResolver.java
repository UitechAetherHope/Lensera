package com.photoblog.springboot_photo.service.vision;

import com.photoblog.springboot_photo.config.VisionCategoryProperties.Provider;

/**
 * 从 application-local.properties 或环境变量读取各厂商 API Key。
 */
public final class VisionApiKeyResolver {

    private VisionApiKeyResolver() {}

    public static String resolve(String providerId, Provider provider) {
        if (provider == null) {
            return "";
        }
        if (provider.getApiKey() != null && !provider.getApiKey().isBlank()) {
            return provider.getApiKey().trim();
        }
        String envName =
                switch (providerId != null ? providerId.toLowerCase() : "") {
                    case "doubao" -> "DOUBAO_API_KEY";
                    case "deepseek" -> "DEEPSEEK_API_KEY";
                    case "qwen" -> "QWEN_API_KEY";
                    case "zhipu" -> "ZHIPU_API_KEY";
                    default -> null;
                };
        if (envName == null) {
            return "";
        }
        String fromEnv = System.getenv(envName);
        return fromEnv != null ? fromEnv.trim() : "";
    }

    public static boolean isConfigured(String providerId, Provider provider) {
        if (provider == null || !provider.isEnabled()) {
            return false;
        }
        String key = resolve(providerId, provider);
        return !key.isBlank()
                && provider.getBaseUrl() != null
                && !provider.getBaseUrl().isBlank()
                && provider.getModel() != null
                && !provider.getModel().isBlank();
    }
}
