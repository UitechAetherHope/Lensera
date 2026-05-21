package com.photoblog.springboot_photo.service;

import com.photoblog.springboot_photo.pojo.BlogComment;
import com.photoblog.springboot_photo.pojo.BlogCommentLike;
import com.photoblog.springboot_photo.pojo.BlogPost;
import com.photoblog.springboot_photo.repostity.BlogCommentLikeRepository;
import com.photoblog.springboot_photo.repostity.BlogCommentRepository;
import com.photoblog.springboot_photo.repostity.BlogPostRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

/** 将 Redis 中的博客阅读增量、评论点赞集合定时写入 MySQL */
@Component
@ConditionalOnProperty(prefix = "app.redis", name = "blog-stats-enabled", havingValue = "true", matchIfMissing = true)
public class BlogStatsFlushScheduler {

    private static final Logger log = LoggerFactory.getLogger(BlogStatsFlushScheduler.class);

    private final ObjectProvider<BlogStatsRedisService> statsProvider;
    private final BlogPostRepository blogPostRepository;
    private final BlogCommentRepository blogCommentRepository;
    private final BlogCommentLikeRepository blogCommentLikeRepository;

    public BlogStatsFlushScheduler(
            ObjectProvider<BlogStatsRedisService> statsProvider,
            BlogPostRepository blogPostRepository,
            BlogCommentRepository blogCommentRepository,
            BlogCommentLikeRepository blogCommentLikeRepository) {
        this.statsProvider = statsProvider;
        this.blogPostRepository = blogPostRepository;
        this.blogCommentRepository = blogCommentRepository;
        this.blogCommentLikeRepository = blogCommentLikeRepository;
    }

    @Scheduled(fixedDelayString = "${app.redis.blog-stats-flush-interval-ms:60000}")
    public void flushScheduled() {
        BlogStatsRedisService stats = statsProvider.getIfAvailable();
        if (stats == null) {
            return;
        }
        if (!stats.tryAcquireFlushLock()) {
            return;
        }
        try {
            flushViews(stats);
            flushCommentLikes(stats);
        } finally {
            stats.releaseFlushLock();
        }
    }

    @Transactional
    void flushViews(BlogStatsRedisService stats) {
        Set<String> blogIds = stats.drainDirtyViewBlogIds();
        for (String idStr : blogIds) {
            try {
                long blogId = Long.parseLong(idStr);
                int inc = stats.takePendingViewIncrement(blogId);
                if (inc <= 0) {
                    continue;
                }
                BlogPost post = blogPostRepository.findById(blogId).orElse(null);
                if (post == null) {
                    continue;
                }
                post.setViewCount(post.getViewCount() + inc);
                blogPostRepository.save(post);
                log.debug("flushed blog views blogId={} +{}", blogId, inc);
            } catch (Exception e) {
                log.warn("flush view failed blogId={}: {}", idStr, e.getMessage());
            }
        }
    }

    @Transactional
    void flushCommentLikes(BlogStatsRedisService stats) {
        Set<String> commentIds = stats.drainDirtyCommentIds();
        for (String idStr : commentIds) {
            try {
                long commentId = Long.parseLong(idStr);
                BlogComment comment = blogCommentRepository.findById(commentId).orElse(null);
                if (comment == null) {
                    continue;
                }
                Set<Integer> likerIds = stats.commentLikerUserIds(commentId);
                syncCommentLikesToDb(commentId, likerIds);
                comment.setLikeCount(likerIds.size());
                blogCommentRepository.save(comment);
                log.debug("flushed comment likes commentId={} count={}", commentId, likerIds.size());
            } catch (Exception e) {
                log.warn("flush comment like failed commentId={}: {}", idStr, e.getMessage());
            }
        }
    }

    private void syncCommentLikesToDb(long commentId, Set<Integer> likerIds) {
        Set<Integer> desired = likerIds != null ? likerIds : Set.of();
        Set<Integer> existing = new HashSet<>();
        blogCommentLikeRepository
                .findAllByCommentId(commentId)
                .forEach(row -> existing.add(row.getUserId()));

        for (Integer uid : desired) {
            if (!existing.contains(uid)) {
                BlogCommentLike row = new BlogCommentLike();
                row.setCommentId(commentId);
                row.setUserId(uid);
                blogCommentLikeRepository.save(row);
            }
        }
        for (Integer uid : existing) {
            if (!desired.contains(uid)) {
                blogCommentLikeRepository.deleteByCommentIdAndUserId(commentId, uid);
            }
        }
    }
}
