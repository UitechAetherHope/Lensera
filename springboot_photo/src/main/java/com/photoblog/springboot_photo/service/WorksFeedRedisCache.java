package com.photoblog.springboot_photo.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.photoblog.springboot_photo.pojo.dto.WorkFeedCardResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * 全站作品流 Redis 缓存：按「版本号 + 分类 + 浏览者」分键；作品增删改赞后递增版本使旧键自然过期（配合 TTL）。
 */
@Component
@ConditionalOnProperty(prefix = "app.redis", name = "feed-cache-enabled", havingValue = "true", matchIfMissing = true)
public class WorksFeedRedisCache {

    private static final Logger log = LoggerFactory.getLogger(WorksFeedRedisCache.class);
    private static final String VERSION_KEY = "works:feed:ver";
    private static final String ENTRY_PREFIX = "works:feed:v:";

    private final StringRedisTemplate redis;
    /** 不依赖容器里的 ObjectMapper（Spring Boot 4 下未必注册为 Bean），避免启动失败 */
    private final ObjectMapper objectMapper =
            new ObjectMapper()
                    .configure(DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES, false)
                    .configure(DeserializationFeature.FAIL_ON_NULL_CREATOR_PROPERTIES, false);

    @Value("${app.redis.feed-cache-ttl-seconds:120}")
    private long ttlSeconds;

    public WorksFeedRedisCache(StringRedisTemplate redis) {
        this.redis = redis;
    }

    /** 作品/点赞等变更后调用，使当前所有 feed 缓存键立即失效逻辑版本 */
    public void bumpVersion() {
        try {
            redis.opsForValue().increment(VERSION_KEY);
        } catch (Exception e) {
            log.warn("Redis bump feed version failed: {}", e.getMessage());
        }
    }

    public List<WorkFeedCardResponse> getOrCompute(
            String category, Optional<Integer> viewerUserId, Supplier<List<WorkFeedCardResponse>> loader) {
        try {
            String ver = redis.opsForValue().get(VERSION_KEY);
            if (ver == null || ver.isBlank()) {
                ver = "0";
            }
            String catKey = (category == null || category.isBlank()) ? "ALL" : category.trim();
            String viewerKey = viewerUserId.map(Object::toString).orElse("anon");
            String redisKey = ENTRY_PREFIX + ver + ":" + catKey + ":" + viewerKey;
            String json = redis.opsForValue().get(redisKey);
            if (json != null && !json.isEmpty()) {
                return objectMapper.readValue(json, new TypeReference<List<WorkFeedCardResponse>>() {});
            }
            List<WorkFeedCardResponse> fresh = loader.get();
            redis.opsForValue().set(
                    redisKey, objectMapper.writeValueAsString(fresh), Duration.ofSeconds(Math.max(30, ttlSeconds)));
            return fresh;
        } catch (Exception e) {
            log.warn("Redis feed cache unavailable, loading from DB: {}", e.getMessage());
            return loader.get();
        }
    }
}
