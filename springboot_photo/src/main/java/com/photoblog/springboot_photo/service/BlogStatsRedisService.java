package com.photoblog.springboot_photo.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Collection;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.Set;

/**
 * 博客阅读数 / 评论点赞数：Redis 热数据 + 定时落库。
 * <ul>
 *   <li>阅读：按 viewerKey 去重（登录 u:{userId}，未登录 ip:{hash}），同一用户多次仅计 1</li>
 *   <li>点赞：评论点赞用户集合在 Redis，展示用 SCARD，定时同步到 tb_blog_comment_like / like_count</li>
 * </ul>
 */
@Service
@ConditionalOnBean(StringRedisTemplate.class)
@ConditionalOnProperty(prefix = "app.redis", name = "blog-stats-enabled", havingValue = "true", matchIfMissing = true)
public class BlogStatsRedisService {

    private static final Logger log = LoggerFactory.getLogger(BlogStatsRedisService.class);

    private static final String VIEW_UNIQ_PREFIX = "blog:stats:view:uniq:";
    private static final String VIEW_PENDING = "blog:stats:view:pending";
    private static final String VIEW_DIRTY = "blog:stats:view:dirty";

    private static final String CL_LIKERS_PREFIX = "blog:stats:cl:likers:";
    private static final String CL_DIRTY = "blog:stats:cl:dirty";

    private static final String FLUSH_LOCK = "blog:stats:flush:lock";

    private final StringRedisTemplate redis;

    @Value("${app.redis.blog-stats-flush-lock-seconds:55}")
    private int flushLockSeconds;

    public BlogStatsRedisService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    /** @param viewerUserId 登录用户 ID，未登录传 null */
    public String viewerKey(Integer viewerUserId, String clientIp) {
        if (viewerUserId != null) {
            return "u:" + viewerUserId;
        }
        String ip = clientIp != null ? clientIp.trim() : "";
        if (ip.isEmpty()) {
            return "anon:unknown";
        }
        return "ip:" + sha256Hex(ip);
    }

    /** 记录一次有效阅读（去重后 pending +1），返回 SADD 结果：1=新增，0=已存在 */
    public Long recordViewReturningAdded(long blogId, String viewerKey) {
        if (blogId <= 0 || viewerKey == null || viewerKey.isBlank()) {
            return 0L;
        }
        try {
            String uniqKey = VIEW_UNIQ_PREFIX + blogId;
            Long added = redis.opsForSet().add(uniqKey, viewerKey);
            if (added != null && added > 0) {
                redis.opsForHash().increment(VIEW_PENDING, String.valueOf(blogId), 1);
                redis.opsForSet().add(VIEW_DIRTY, String.valueOf(blogId));
            }
            return added != null ? added : 0L;
        } catch (Exception e) {
            log.warn("recordView redis failed blogId={}: {}", blogId, e.getMessage());
            throw e;
        }
    }

    /** @deprecated 请使用 {@link #recordViewReturningAdded} */
    public void recordView(long blogId, String viewerKey) {
        recordViewReturningAdded(blogId, viewerKey);
    }

    /** 列表/详情展示：库内累计 + Redis 未落库增量 */
    public int displayViewCount(int dbCount, long blogId) {
        try {
            Object pendingObj = redis.opsForHash().get(VIEW_PENDING, String.valueOf(blogId));
            String pending = pendingObj != null ? pendingObj.toString() : null;
            if (pending == null || pending.isBlank()) {
                return dbCount;
            }
            return dbCount + Integer.parseInt(pending);
        } catch (Exception e) {
            log.warn("displayViewCount redis failed blogId={}: {}", blogId, e.getMessage());
            return dbCount;
        }
    }

    public boolean recordCommentLike(long commentId, int userId) {
        try {
            String key = CL_LIKERS_PREFIX + commentId;
            Long added = redis.opsForSet().add(key, String.valueOf(userId));
            if (added != null && added > 0) {
                redis.opsForSet().add(CL_DIRTY, String.valueOf(commentId));
                return true;
            }
            return false;
        } catch (Exception e) {
            log.warn("recordCommentLike redis failed commentId={}: {}", commentId, e.getMessage());
            return false;
        }
    }

    public boolean removeCommentLike(long commentId, int userId) {
        try {
            String key = CL_LIKERS_PREFIX + commentId;
            Long removed = redis.opsForSet().remove(key, String.valueOf(userId));
            if (removed != null && removed > 0) {
                redis.opsForSet().add(CL_DIRTY, String.valueOf(commentId));
                return true;
            }
            return false;
        } catch (Exception e) {
            log.warn("removeCommentLike redis failed commentId={}: {}", commentId, e.getMessage());
            return false;
        }
    }

    public int displayCommentLikeCount(int dbCount, long commentId) {
        try {
            Long size = redis.opsForSet().size(CL_LIKERS_PREFIX + commentId);
            if (size == null || size == 0) {
                return dbCount;
            }
            return Math.max(dbCount, size.intValue());
        } catch (Exception e) {
            log.warn("displayCommentLikeCount redis failed commentId={}: {}", commentId, e.getMessage());
            return dbCount;
        }
    }

    public boolean isCommentLiked(long commentId, int userId) {
        try {
            Boolean member =
                    redis.opsForSet().isMember(CL_LIKERS_PREFIX + commentId, String.valueOf(userId));
            return Boolean.TRUE.equals(member);
        } catch (Exception e) {
            log.warn("isCommentLiked redis failed commentId={}: {}", commentId, e.getMessage());
            return false;
        }
    }

    public Set<Long> batchCommentLiked(int userId, Collection<Long> commentIds) {
        Set<Long> liked = new HashSet<>();
        if (commentIds == null || commentIds.isEmpty()) {
            return liked;
        }
        String uid = String.valueOf(userId);
        for (Long commentId : commentIds) {
            if (commentId == null) {
                continue;
            }
            try {
                if (Boolean.TRUE.equals(redis.opsForSet().isMember(CL_LIKERS_PREFIX + commentId, uid))) {
                    liked.add(commentId);
                }
            } catch (Exception e) {
                log.warn("batchCommentLiked redis failed commentId={}: {}", commentId, e.getMessage());
            }
        }
        return liked;
    }

    public boolean tryAcquireFlushLock() {
        try {
            Boolean ok =
                    redis.opsForValue()
                            .setIfAbsent(FLUSH_LOCK, "1", java.time.Duration.ofSeconds(Math.max(10, flushLockSeconds)));
            return Boolean.TRUE.equals(ok);
        } catch (Exception e) {
            log.warn("flush lock failed: {}", e.getMessage());
            return false;
        }
    }

    public void releaseFlushLock() {
        try {
            redis.delete(FLUSH_LOCK);
        } catch (Exception ignored) {
            // ignore
        }
    }

    public Set<String> drainDirtyViewBlogIds() {
        try {
            Set<String> ids = redis.opsForSet().members(VIEW_DIRTY);
            if (ids == null || ids.isEmpty()) {
                return Set.of();
            }
            redis.opsForSet().remove(VIEW_DIRTY, ids.toArray());
            return ids;
        } catch (Exception e) {
            log.warn("drainDirtyViewBlogIds failed: {}", e.getMessage());
            return Set.of();
        }
    }

    public int takePendingViewIncrement(long blogId) {
        try {
            String field = String.valueOf(blogId);
            Object pendingObj = redis.opsForHash().get(VIEW_PENDING, field);
            String pending = pendingObj != null ? pendingObj.toString() : null;
            if (pending == null || pending.isBlank()) {
                return 0;
            }
            int inc = Integer.parseInt(pending);
            redis.opsForHash().delete(VIEW_PENDING, field);
            return inc;
        } catch (Exception e) {
            log.warn("takePendingViewIncrement failed blogId={}: {}", blogId, e.getMessage());
            return 0;
        }
    }

    public Set<String> drainDirtyCommentIds() {
        try {
            Set<String> ids = redis.opsForSet().members(CL_DIRTY);
            if (ids == null || ids.isEmpty()) {
                return Set.of();
            }
            redis.opsForSet().remove(CL_DIRTY, ids.toArray());
            return ids;
        } catch (Exception e) {
            log.warn("drainDirtyCommentIds failed: {}", e.getMessage());
            return Set.of();
        }
    }

    public Set<Integer> commentLikerUserIds(long commentId) {
        try {
            Set<String> raw = redis.opsForSet().members(CL_LIKERS_PREFIX + commentId);
            if (raw == null || raw.isEmpty()) {
                return Set.of();
            }
            Set<Integer> out = new HashSet<>();
            for (String s : raw) {
                try {
                    out.add(Integer.parseInt(s));
                } catch (NumberFormatException ignored) {
                    // skip
                }
            }
            return out;
        } catch (Exception e) {
            log.warn("commentLikerUserIds failed commentId={}: {}", commentId, e.getMessage());
            return Set.of();
        }
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            return Integer.toHexString(input.hashCode());
        }
    }
}
