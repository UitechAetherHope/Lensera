package com.photoblog.springboot_photo.service;

import com.photoblog.springboot_photo.pojo.BlogView;
import com.photoblog.springboot_photo.repostity.BlogPostRepository;
import com.photoblog.springboot_photo.repostity.BlogViewRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 博客统计门面：优先 Redis（热数据 + 定时落库），Redis 不可用时回退数据库去重计数。
 */
@Service
public class BlogStatsService {

    private static final Logger log = LoggerFactory.getLogger(BlogStatsService.class);

    private final ObjectProvider<BlogStatsRedisService> redisProvider;
    private final BlogViewRepository blogViewRepository;
    private final BlogPostRepository blogPostRepository;

    public BlogStatsService(
            ObjectProvider<BlogStatsRedisService> redisProvider,
            BlogViewRepository blogViewRepository,
            BlogPostRepository blogPostRepository) {
        this.redisProvider = redisProvider;
        this.blogViewRepository = blogViewRepository;
        this.blogPostRepository = blogPostRepository;
    }

    public String viewerKey(Integer viewerUserId, String clientIp) {
        BlogStatsRedisService redis = redisProvider.getIfAvailable();
        if (redis != null) {
            return redis.viewerKey(viewerUserId, clientIp);
        }
        if (viewerUserId != null) {
            return "u:" + viewerUserId;
        }
        String ip = clientIp != null ? clientIp.trim() : "";
        return ip.isEmpty() ? "anon:unknown" : "ip:" + Integer.toHexString(ip.hashCode());
    }

    /**
     * 记录阅读，返回本次是否新增 1 次有效阅读。
     */
    @Transactional
    public boolean recordView(long blogId, Integer viewerUserId, String clientIp) {
        String key = viewerKey(viewerUserId, clientIp);
        BlogStatsRedisService redis = redisProvider.getIfAvailable();
        if (redis != null) {
            try {
                String uniqKey = "blog:stats:view:uniq:" + blogId;
                Long added = redis.recordViewReturningAdded(blogId, key);
                if (added != null && added > 0) {
                    log.debug("blog view recorded (redis) blogId={} viewer={}", blogId, key);
                    return true;
                }
                return false;
            } catch (Exception e) {
                log.warn("redis recordView failed, fallback db blogId={}: {}", blogId, e.getMessage());
            }
        }
        return recordViewDb(blogId, key);
    }

    public int displayViewCount(int dbCount, long blogId) {
        BlogStatsRedisService redis = redisProvider.getIfAvailable();
        if (redis != null) {
            return redis.displayViewCount(dbCount, blogId);
        }
        return dbCount;
    }

    public boolean recordCommentLike(long commentId, int userId) {
        BlogStatsRedisService redis = redisProvider.getIfAvailable();
        if (redis != null) {
            return redis.recordCommentLike(commentId, userId);
        }
        return false;
    }

    public boolean removeCommentLike(long commentId, int userId) {
        BlogStatsRedisService redis = redisProvider.getIfAvailable();
        if (redis != null) {
            return redis.removeCommentLike(commentId, userId);
        }
        return false;
    }

    public int displayCommentLikeCount(int dbCount, long commentId) {
        BlogStatsRedisService redis = redisProvider.getIfAvailable();
        if (redis != null) {
            return redis.displayCommentLikeCount(dbCount, commentId);
        }
        return dbCount;
    }

    public boolean isCommentLiked(long commentId, int userId) {
        BlogStatsRedisService redis = redisProvider.getIfAvailable();
        if (redis != null) {
            return redis.isCommentLiked(commentId, userId);
        }
        return false;
    }

    public java.util.Set<Long> batchCommentLiked(int userId, java.util.Collection<Long> commentIds) {
        BlogStatsRedisService redis = redisProvider.getIfAvailable();
        if (redis != null) {
            return redis.batchCommentLiked(userId, commentIds);
        }
        return java.util.Set.of();
    }

    protected boolean recordViewDb(long blogId, String viewerKey) {
        if (blogId <= 0 || viewerKey == null || viewerKey.isBlank()) {
            return false;
        }
        if (blogViewRepository.existsByBlogIdAndViewerKey(blogId, viewerKey)) {
            return false;
        }
        try {
            BlogView row = new BlogView();
            row.setBlogId(blogId);
            row.setViewerKey(viewerKey);
            blogViewRepository.save(row);
            blogPostRepository.incrementViewCount(blogId, 1);
            log.info("blog view recorded (db) blogId={} viewer={}", blogId, viewerKey);
            return true;
        } catch (DataIntegrityViolationException e) {
            return false;
        }
    }
}
