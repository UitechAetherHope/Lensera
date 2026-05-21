package com.photoblog.springboot_photo.service;

import com.photoblog.springboot_photo.exception.ApiException;
import com.photoblog.springboot_photo.pojo.BlogComment;
import com.photoblog.springboot_photo.pojo.BlogCommentLike;
import com.photoblog.springboot_photo.pojo.BlogPost;
import com.photoblog.springboot_photo.pojo.User;
import com.photoblog.springboot_photo.pojo.dto.BlogCommentDto;
import com.photoblog.springboot_photo.repostity.BlogCommentLikeRepository;
import com.photoblog.springboot_photo.repostity.BlogCommentRepository;
import com.photoblog.springboot_photo.repostity.BlogPostRepository;
import com.photoblog.springboot_photo.repostity.UserReposity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class BlogCommentService {

    private static final int STATUS_ACTIVE = 1;
    private static final int STATUS_PUBLISHED = 2;
    private static final long ROOT_ID_PLACEHOLDER = 0L;

    private final BlogPostRepository blogPostRepository;
    private final BlogCommentRepository blogCommentRepository;
    private final BlogCommentLikeRepository blogCommentLikeRepository;
    private final UserReposity userReposity;
    private final AuthService authService;
    private final BlogStatsService blogStatsService;

    @Value("${app.public-base-url:http://localhost:8080}")
    private String publicBaseUrl;

    public BlogCommentService(
            BlogPostRepository blogPostRepository,
            BlogCommentRepository blogCommentRepository,
            BlogCommentLikeRepository blogCommentLikeRepository,
            UserReposity userReposity,
            AuthService authService,
            BlogStatsService blogStatsService) {
        this.blogPostRepository = blogPostRepository;
        this.blogCommentRepository = blogCommentRepository;
        this.blogCommentLikeRepository = blogCommentLikeRepository;
        this.userReposity = userReposity;
        this.authService = authService;
        this.blogStatsService = blogStatsService;
    }

    public List<BlogCommentDto> listCommentTree(Long blogId, Optional<Integer> viewerUserId) {
        ensureBlogVisible(blogId, viewerUserId);
        List<BlogComment> rows =
                blogCommentRepository.findByBlogIdAndStatusOrderByCreatedAtAsc(blogId, STATUS_ACTIVE);
        if (rows.isEmpty()) {
            return List.of();
        }

        Set<Integer> authorIds = rows.stream().map(BlogComment::getUserId).collect(Collectors.toSet());
        Map<Integer, User> authorById = userReposity.findByUserIdIn(authorIds).stream()
                .map(authService::assignPublicIdIfMissing)
                .collect(Collectors.toMap(User::getUserId, u -> u, (a, b) -> a));

        List<Long> commentIds = rows.stream().map(BlogComment::getCommentId).collect(Collectors.toList());
        Set<Long> likedIds = resolveLikedCommentIds(viewerUserId, commentIds);

        Map<Long, BlogCommentDto> dtoById = new HashMap<>();
        for (BlogComment c : rows) {
            dtoById.put(c.getCommentId(), toDto(c, authorById, likedIds, new ArrayList<>()));
        }

        List<BlogCommentDto> roots = new ArrayList<>();
        for (BlogComment c : rows) {
            BlogCommentDto dto = dtoById.get(c.getCommentId());
            if (c.getParentId() == null) {
                roots.add(dto);
            } else {
                Long rootKey = resolveRootId(c);
                BlogCommentDto rootDto = dtoById.get(rootKey);
                BlogCommentDto parentDto = dtoById.get(c.getParentId());
                if (parentDto != null && dto.replyToAuthorName() == null) {
                    dto = copyWithReplyTo(dto, parentDto.authorName());
                    dtoById.put(c.getCommentId(), dto);
                }
                if (rootDto != null) {
                    rootDto.replies().add(dto);
                }
            }
        }

        return roots.stream().map(this::freezeCommentNode).collect(Collectors.toList());
    }

    @Transactional
    public BlogCommentDto createComment(Long blogId, Integer userId, String bodyRaw, Long parentId) {
        ensureBlogVisible(blogId, Optional.of(userId));
        String body = normalizeBody(bodyRaw);

        User author = userReposity.findById(userId).orElseThrow(() -> new ApiException(404, "用户不存在"));
        author = authService.assignPublicIdIfMissing(author);

        BlogComment comment = new BlogComment();
        comment.setBlogId(blogId);
        comment.setUserId(userId);
        comment.setBody(body);
        comment.setLikeCount(0);
        comment.setStatus(STATUS_ACTIVE);

        if (parentId == null) {
            comment.setParentId(null);
            comment.setRootId(ROOT_ID_PLACEHOLDER);
            BlogComment saved = blogCommentRepository.saveAndFlush(comment);
            saved.setRootId(saved.getCommentId());
            saved = blogCommentRepository.save(saved);
            refreshBlogCommentCount(blogId);
            return toDto(saved, Map.of(userId, author), Set.of(), List.of());
        }

        BlogComment parent =
                blogCommentRepository.findById(parentId).orElseThrow(() -> new ApiException(404, "父评论不存在"));
        if (!Objects.equals(parent.getBlogId(), blogId) || parent.getStatus() != STATUS_ACTIVE) {
            throw new ApiException(400, "无法回复该评论");
        }
        comment.setParentId(parentId);
        comment.setRootId(resolveRootId(parent));
        BlogComment saved = blogCommentRepository.save(comment);
        refreshBlogCommentCount(blogId);
        return toDto(saved, Map.of(userId, author), Set.of(), List.of());
    }

    @Transactional
    public BlogCommentDto likeComment(Long blogId, Long commentId, Integer userId) {
        BlogComment c = loadActiveComment(blogId, commentId);
        if (blogStatsService.isCommentLiked(commentId, userId)
                || blogCommentLikeRepository.existsByCommentIdAndUserId(commentId, userId)) {
            throw new ApiException(409, "已点赞");
        }
        if (blogStatsService.recordCommentLike(commentId, userId)) {
            return loadSingleDto(c, userId);
        }
        if (blogCommentLikeRepository.existsByCommentIdAndUserId(commentId, userId)) {
            throw new ApiException(409, "已点赞");
        }
        BlogCommentLike row = new BlogCommentLike();
        row.setCommentId(commentId);
        row.setUserId(userId);
        blogCommentLikeRepository.save(row);
        c.setLikeCount(c.getLikeCount() + 1);
        blogCommentRepository.save(c);
        return loadSingleDto(c, userId);
    }

    @Transactional
    public BlogCommentDto unlikeComment(Long blogId, Long commentId, Integer userId) {
        BlogComment c = loadActiveComment(blogId, commentId);
        boolean inRedis = blogStatsService.isCommentLiked(commentId, userId);
        boolean inDb = blogCommentLikeRepository.existsByCommentIdAndUserId(commentId, userId);
        if (!inRedis && !inDb) {
            return loadSingleDto(c, userId);
        }
        if (blogStatsService.removeCommentLike(commentId, userId)) {
            return loadSingleDto(c, userId);
        }
        if (!blogCommentLikeRepository.existsByCommentIdAndUserId(commentId, userId)) {
            return loadSingleDto(c, userId);
        }
        blogCommentLikeRepository.deleteByCommentIdAndUserId(commentId, userId);
        c.setLikeCount(Math.max(0, c.getLikeCount() - 1));
        blogCommentRepository.save(c);
        return loadSingleDto(c, userId);
    }

    @Transactional
    public void deleteOwnComment(Long blogId, Long commentId, Integer userId) {
        BlogComment c = loadActiveComment(blogId, commentId);
        if (!Objects.equals(c.getUserId(), userId)) {
            throw new ApiException(403, "只能删除自己的评论");
        }
        c.setStatus(0);
        c.setBody("该评论已删除");
        blogCommentRepository.save(c);
        refreshBlogCommentCount(blogId);
    }

    private void refreshBlogCommentCount(Long blogId) {
        BlogPost post = blogPostRepository.findById(blogId).orElseThrow(() -> new ApiException(404, "博客不存在"));
        int count = (int) blogCommentRepository.countByBlogIdAndStatus(blogId, STATUS_ACTIVE);
        post.setCommentCount(count);
        blogPostRepository.save(post);
    }

    private static Long resolveRootId(BlogComment c) {
        if (c.getParentId() == null) {
            return c.getCommentId();
        }
        Long root = c.getRootId();
        if (root != null && root > ROOT_ID_PLACEHOLDER) {
            return root;
        }
        return c.getCommentId();
    }

    private BlogComment loadActiveComment(Long blogId, Long commentId) {
        BlogComment c = blogCommentRepository.findById(commentId).orElseThrow(() -> new ApiException(404, "评论不存在"));
        if (!Objects.equals(c.getBlogId(), blogId) || c.getStatus() != STATUS_ACTIVE) {
            throw new ApiException(404, "评论不存在");
        }
        return c;
    }

    private BlogCommentDto loadSingleDto(BlogComment c, Integer viewerUserId) {
        User author = authService.assignPublicIdIfMissing(
                userReposity.findById(c.getUserId()).orElseThrow(() -> new ApiException(404, "用户不存在")));
        Set<Long> liked = resolveLikedCommentIds(Optional.of(viewerUserId), List.of(c.getCommentId()));
        return toDto(c, Map.of(author.getUserId(), author), liked, List.of());
    }

    private Set<Long> resolveLikedCommentIds(Optional<Integer> viewerUserId, List<Long> commentIds) {
        if (viewerUserId.isEmpty() || commentIds.isEmpty()) {
            return Collections.emptySet();
        }
        int uid = viewerUserId.get();
        Set<Long> liked = new HashSet<>(blogCommentLikeRepository.findCommentIdsByUserIdAndCommentIdIn(uid, commentIds));
        liked.addAll(blogStatsService.batchCommentLiked(uid, commentIds));
        return liked;
    }

    private int resolveDisplayLikeCount(BlogComment c) {
        return blogStatsService.displayCommentLikeCount(c.getLikeCount(), c.getCommentId());
    }

    private void ensureBlogVisible(Long blogId, Optional<Integer> viewerUserId) {
        BlogPost post = blogPostRepository.findById(blogId).orElseThrow(() -> new ApiException(404, "博客不存在"));
        boolean owner = viewerUserId.map(id -> id.equals(post.getUserId())).orElse(false);
        if (post.getStatus() != STATUS_PUBLISHED && !owner) {
            throw new ApiException(404, "博客不存在或未发布");
        }
    }

    private static String normalizeBody(String raw) {
        String s = raw != null ? raw.trim() : "";
        if (s.isEmpty()) {
            throw new ApiException(400, "评论内容不能为空");
        }
        if (s.length() > 2000) {
            throw new ApiException(400, "评论过长");
        }
        return s;
    }

    private BlogCommentDto freezeCommentNode(BlogCommentDto node) {
        List<BlogCommentDto> frozenReplies =
                node.replies().stream().map(this::freezeCommentNode).collect(Collectors.toList());
        return copyWithReplies(node, frozenReplies);
    }

    private static BlogCommentDto copyWithReplies(BlogCommentDto n, List<BlogCommentDto> replies) {
        return new BlogCommentDto(
                n.commentId(),
                n.parentId(),
                n.rootId(),
                n.authorPublicId(),
                n.authorName(),
                n.authorAvatarUrl(),
                n.replyToAuthorName(),
                n.body(),
                n.likeCount(),
                n.likedByMe(),
                n.createdAtEpochMs(),
                replies);
    }

    private static BlogCommentDto copyWithReplyTo(BlogCommentDto n, String replyToAuthorName) {
        return new BlogCommentDto(
                n.commentId(),
                n.parentId(),
                n.rootId(),
                n.authorPublicId(),
                n.authorName(),
                n.authorAvatarUrl(),
                replyToAuthorName,
                n.body(),
                n.likeCount(),
                n.likedByMe(),
                n.createdAtEpochMs(),
                n.replies());
    }

    private BlogCommentDto toDto(
            BlogComment c, Map<Integer, User> authorById, Set<Long> likedIds, List<BlogCommentDto> replies) {
        User author = authorById.get(c.getUserId());
        String name = author != null ? author.getUserName() : "用户";
        Long publicId = author != null ? author.getPublicId() : null;
        String avatar = author != null ? buildAvatarUrl(author.getAvatarPath()) : null;
        Boolean liked = likedIds.isEmpty() ? null : likedIds.contains(c.getCommentId());
        return new BlogCommentDto(
                c.getCommentId(),
                c.getParentId(),
                c.getRootId(),
                publicId,
                name,
                avatar,
                null,
                c.getBody(),
                resolveDisplayLikeCount(c),
                liked,
                c.getCreatedAt() != null ? c.getCreatedAt().toEpochMilli() : 0L,
                replies);
    }

    private String buildAvatarUrl(String avatarPath) {
        if (avatarPath == null || avatarPath.isBlank()) {
            return null;
        }
        String p = avatarPath.trim().replace('\\', '/');
        if (p.contains("..")) {
            return null;
        }
        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        return base + "/files/" + p;
    }
}
