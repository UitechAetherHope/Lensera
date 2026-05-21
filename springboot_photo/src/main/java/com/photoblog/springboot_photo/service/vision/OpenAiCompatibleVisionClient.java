package com.photoblog.springboot_photo.service.vision;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.photoblog.springboot_photo.config.VisionCategoryProperties.Provider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * 调用 OpenAI 兼容的 /chat/completions 多模态接口（豆包方舟、DeepSeek、通义、智谱等）。
 */
public class OpenAiCompatibleVisionClient {

    private static final Logger log = LoggerFactory.getLogger(OpenAiCompatibleVisionClient.class);
    private static final ObjectMapper JSON = new ObjectMapper();

    private final String providerId;
    private final Provider config;
    private final RestClient restClient;

    public OpenAiCompatibleVisionClient(String providerId, Provider config, String apiKey) {
        this.providerId = providerId;
        this.config = config;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15_000);
        factory.setReadTimeout(120_000);
        String base = config.getBaseUrl().endsWith("/")
                ? config.getBaseUrl().substring(0, config.getBaseUrl().length() - 1)
                : config.getBaseUrl();
        String key = apiKey != null ? apiKey.trim() : "";
        this.restClient =
                RestClient.builder()
                        .baseUrl(base)
                        .requestFactory(factory)
                        .defaultHeader("Authorization", "Bearer " + key)
                        .build();
    }

    /**
     * @param imageDataUrl data:image/jpeg;base64,...
     * @return 模型原始文本
     */
    public String analyzeImage(String imageDataUrl, String prompt) {
        return analyzeImage(imageDataUrl, prompt, config.getModel().trim());
    }

    public String analyzeImage(String imageDataUrl, String prompt, String model) {
        ObjectNode body = JSON.createObjectNode();
        body.put("model", model != null && !model.isBlank() ? model.trim() : config.getModel().trim());
        body.put("max_tokens", 32);
        body.put("temperature", 0.1);

        ObjectNode userMsg = JSON.createObjectNode();
        userMsg.put("role", "user");
        ArrayNode parts = userMsg.putArray("content");
        ObjectNode img = parts.addObject();
        img.put("type", "image_url");
        img.putObject("image_url").put("url", imageDataUrl);
        parts.addObject().put("type", "text").put("text", prompt);
        body.putArray("messages").add(userMsg);

        try {
            String response =
                    restClient
                            .post()
                            .uri("/chat/completions")
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(body.toString())
                            .retrieve()
                            .body(String.class);
            return extractContent(response);
        } catch (RestClientResponseException e) {
            if (shouldFallback(e)) {
                log.warn(
                        "vision provider={} http {} body={}",
                        providerId,
                        e.getStatusCode().value(),
                        truncate(e.getResponseBodyAsString(), 300));
                throw new VisionProviderException("quota_or_error", e);
            }
            log.error(
                    "vision provider={} failed http {} body={}",
                    providerId,
                    e.getStatusCode().value(),
                    truncate(e.getResponseBodyAsString(), 500));
            throw new VisionProviderException("fatal", e);
        } catch (VisionProviderException e) {
            throw e;
        } catch (Exception e) {
            log.error("vision provider={} request error: {}", providerId, e.getMessage());
            throw new VisionProviderException("network", e);
        }
    }

    private static String extractContent(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            throw new VisionProviderException("empty_response", new IllegalStateException("empty body"));
        }
        try {
            JsonNode root = JSON.readTree(responseBody);
            JsonNode err = root.get("error");
            if (err != null && !err.isNull()) {
                String msg = err.path("message").asText(err.toString());
                if (isQuotaMessage(msg) || isModelAccessMessage(msg)) {
                    throw new VisionProviderException("quota", new IllegalStateException(msg));
                }
                throw new VisionProviderException("api_error", new IllegalStateException(msg));
            }
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isTextual()) {
                return content.asText().trim();
            }
            if (content.isArray()) {
                StringBuilder sb = new StringBuilder();
                for (JsonNode part : content) {
                    if ("text".equals(part.path("type").asText()) && part.has("text")) {
                        sb.append(part.get("text").asText());
                    }
                }
                return sb.toString().trim();
            }
            throw new VisionProviderException("no_content", new IllegalStateException("no choices content"));
        } catch (VisionProviderException e) {
            throw e;
        } catch (Exception e) {
            throw new VisionProviderException("parse", e);
        }
    }

    private static boolean shouldFallback(RestClientResponseException e) {
        int code = e.getStatusCode().value();
        if (code == 404 || code == 429 || code == 402 || code == 403 || code >= 500) {
            return true;
        }
        String body = e.getResponseBodyAsString();
        return isQuotaMessage(body) || isModelAccessMessage(body);
    }

    private static boolean isModelAccessMessage(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String s = text.toLowerCase();
        return s.contains("model")
                || s.contains("endpoint")
                || s.contains("not found")
                || s.contains("does not exist")
                || s.contains("模型")
                || s.contains("接入点")
                || s.contains("无权")
                || s.contains("invalid");
    }

    private static boolean isQuotaMessage(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String s = text.toLowerCase();
        return s.contains("quota")
                || s.contains("rate limit")
                || s.contains("insufficient")
                || s.contains("余额")
                || s.contains("额度")
                || s.contains("限流")
                || s.contains("exceeded")
                || s.contains("resource_exhausted");
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }

    public static class VisionProviderException extends RuntimeException {
        private final String kind;

        public VisionProviderException(String kind, Throwable cause) {
            super(cause);
            this.kind = kind;
        }

        public boolean isFallbackable() {
            return "quota_or_error".equals(kind)
                    || "quota".equals(kind)
                    || "network".equals(kind)
                    || "api_error".equals(kind);
        }
    }
}
