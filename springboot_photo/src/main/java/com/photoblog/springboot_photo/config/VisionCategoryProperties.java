package com.photoblog.springboot_photo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 作品图云端视觉分类（豆包 / DeepSeek / 通义 / 智谱等 OpenAI 兼容接口）。
 * API Key 请写在 application-local.properties，勿提交仓库。
 */
@ConfigurationProperties(prefix = "app.vision")
public class VisionCategoryProperties {

    private boolean enabled = true;

    /** true 时上传接口先返回，后台写 category */
    private boolean async = true;

    /**
     * 按顺序尝试；某一厂商额度用尽或限流时自动换下一个。
     * 可选：doubao、deepseek、qwen、zhipu
     */
    private List<String> providerOrder = new ArrayList<>(List.of("doubao", "deepseek", "qwen", "zhipu"));

    private Map<String, Provider> providers = defaultProviders();

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isAsync() {
        return async;
    }

    public void setAsync(boolean async) {
        this.async = async;
    }

    public List<String> getProviderOrder() {
        return providerOrder;
    }

    public void setProviderOrder(List<String> providerOrder) {
        this.providerOrder = providerOrder;
    }

    public Map<String, Provider> getProviders() {
        return providers;
    }

    public void setProviders(Map<String, Provider> providers) {
        this.providers = providers;
    }

    public Provider provider(String id) {
        if (id == null) {
            return null;
        }
        return providers.get(id.trim().toLowerCase());
    }

    private static Map<String, Provider> defaultProviders() {
        Map<String, Provider> m = new LinkedHashMap<>();
        Provider doubao = new Provider();
        doubao.setDisplayName("豆包");
        doubao.setBaseUrl("https://ark.cn-beijing.volces.com/api/v3");
        doubao.setModel("doubao-1-5-vision-pro-32k-250115");
        m.put("doubao", doubao);

        Provider deepseek = new Provider();
        deepseek.setDisplayName("DeepSeek");
        deepseek.setBaseUrl("https://api.deepseek.com");
        deepseek.setModel("deepseek-chat");
        m.put("deepseek", deepseek);

        Provider qwen = new Provider();
        qwen.setDisplayName("通义千问");
        qwen.setBaseUrl("https://dashscope.aliyuncs.com/compatible-mode/v1");
        qwen.setModel("qwen-vl-plus");
        m.put("qwen", qwen);

        Provider zhipu = new Provider();
        zhipu.setDisplayName("智谱");
        zhipu.setBaseUrl("https://open.bigmodel.cn/api/paas/v4");
        zhipu.setModel("glm-4v-flash");
        m.put("zhipu", zhipu);

        return m;
    }

    public static class Provider {
        private boolean enabled = true;
        private String displayName = "";
        private String apiKey = "";
        private String baseUrl = "";
        private String model = "";

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getDisplayName() {
            return displayName;
        }

        public void setDisplayName(String displayName) {
            this.displayName = displayName;
        }

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getModel() {
            return model;
        }

        public void setModel(String model) {
            this.model = model;
        }

        public boolean isConfigured() {
            return enabled && apiKey != null && !apiKey.isBlank() && baseUrl != null && !baseUrl.isBlank() && model != null
                    && !model.isBlank();
        }
    }
}
