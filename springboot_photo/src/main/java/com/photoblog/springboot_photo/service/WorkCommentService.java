package com.photoblog.springboot_photo.service;

import com.photoblog.springboot_photo.exception.ApiException;
import com.photoblog.springboot_photo.pojo.User;
import com.photoblog.springboot_photo.pojo.Work;
import com.photoblog.springboot_photo.pojo.WorkComment;
import com.photoblog.springboot_photo.pojo.WorkCommentLike;
import com.photoblog.springboot_photo.pojo.dto.WorkCommentDto;
import com.photoblog.springboot_photo.repostity.UserReposity;
import com.photoblog.springboot_photo.repostity.WorkCommentLikeRepository;
import com.photoblog.springboot_photo.repostity.WorkCommentRepository;
import com.photoblog.springboot_photo.repostity.WorkRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class WorkCommentService {

    private static final int STATUS_ACTIVE = 1;

    /** 顶级评论首次插入占位（表 root_id NOT NULL 时），插入后立即改为 comment_id */
    private static final long ROOT_ID_PLACEHOLDER = 0L;

    private final WorkRepository workRepository;
    private final WorkCommentRepository workCommentRepository;
    private final WorkCommentLikeRepository workCommentLikeRepository;
    private final UserReposity userReposity;
    private final AuthService authService;

    @Value("${app.public-base-url:http://localhost:8080}")
    private String publicBaseUrl;

    public WorkCommentService(
            WorkRepository workRepository,
            WorkCommentRepository workCommentRepository,
            WorkCommentLikeRepository workCommentLikeRepository,
            UserReposity userReposity,
            AuthService authService) {
        this.workRepository = workRepository;
        this.workCommentRepository = workCommentRepository;
        this.workCommentLikeRepository = workCommentLikeRepository;
        this.userReposity = userReposity;
        this.authService = authService;
    }

    public List<WorkCommentDto> listCommentTree(Long workId, Optional<Integer> viewerUserId) {
        ensureWorkVisible(workId, viewerUserId);
        List<WorkComment> rows =
                workCommentRepository.findByWorkIdAndStatusOrderByCreatedAtAsc(workId, STATUS_ACTIVE);
        if (rows.isEmpty()) {
            return List.of();
        }

        Set<Integer> authorIds = rows.stream().map(WorkComment::getUserId).collect(Collectors.toSet());
        Map<Integer, User> authorById = userReposity.findByUserIdIn(authorIds).stream()
                .map(authService::assignPublicIdIfMissing)
                .collect(Collectors.toMap(User::getUserId, u -> u, (a, b) -> a));

        List<Long> commentIds = rows.stream().map(WorkComment::getCommentId).collect(Collectors.toList());
        Set<Long> likedIds =
                viewerUserId
                        .<Set<Long>>map(
                                uid ->
                                        new HashSet<>(
                                                workCommentLikeRepository.findCommentIdsByUserIdAndCommentIdIn(
                                                        uid, commentIds)))
                        .orElse(Collections.emptySet());

        Map<Long, WorkCommentDto> dtoById = new HashMap<>();
        for (WorkComment c : rows) {
            dtoById.put(c.getCommentId(), toDto(c, authorById, likedIds, new ArrayList<>()));
        }

        List<WorkCommentDto> roots = new ArrayList<>();
        for (WorkComment c : rows) {
            WorkCommentDto dto = dtoById.get(c.getCommentId());
            if (c.getParentId() == null) {
                roots.add(dto);
            } else {
                Long rootKey = resolveRootId(c);
                WorkCommentDto rootDto = dtoById.get(rootKey);
                WorkCommentDto parentDto = dtoById.get(c.getParentId());
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
    public WorkCommentDto createComment(Long workId, Integer userId, String bodyRaw, Long parentId) {
        ensureWorkVisible(workId, Optional.of(userId));
        String body = normalizeBody(bodyRaw);

        User author = userReposity.findById(userId).orElseThrow(() -> new ApiException(404, "用户不存在"));
        author = authService.assignPublicIdIfMissing(author);

        WorkComment comment = new WorkComment();
        comment.setWorkId(workId);
        comment.setUserId(userId);
        comment.setBody(body);
        comment.setLikeCount(0);
        comment.setStatus(STATUS_ACTIVE);

        if (parentId == null) {
            comment.setParentId(null);
            comment.setRootId(ROOT_ID_PLACEHOLDER);
            WorkComment saved = workCommentRepository.saveAndFlush(comment);
            saved.setRootId(saved.getCommentId());
            saved = workCommentRepository.save(saved);
            return toDto(saved, Map.of(userId, author), Set.of(), List.of());
        }

        WorkComment parent =
                workCommentRepository.findById(parentId).orElseThrow(() -> new ApiException(404, "父评论不存在"));
        if (!Objects.equals(parent.getWorkId(), workId) || parent.getStatus() != STATUS_ACTIVE) {
            throw new ApiException(400, "无法回复该评论");
        }
        comment.setParentId(parentId);
        comment.setRootId(resolveRootId(parent));
        WorkComment saved = workCommentRepository.save(comment);
        return toDto(saved, Map.of(userId, author), Set.of(), List.of());
    }

    /** 顶级评论的 root_id；回复挂在所属主楼下 */
    private static Long resolveRootId(WorkComment c) {
        if (c.getParentId() == null) {
            return c.getCommentId();
        }
        Long root = c.getRootId();
        if (root != null && root > ROOT_ID_PLACEHOLDER) {
            return root;
        }
        return c.getCommentId();
    }

    @Transactional
    public WorkCommentDto likeComment(Long workId, Long commentId, Integer userId) {
        WorkComment c = loadActiveComment(workId, commentId);
        if (workCommentLikeRepository.existsByCommentIdAndUserId(commentId, userId)) {
            throw new ApiException(409, "已点赞");
        }
        WorkCommentLike row = new WorkCommentLike();
        row.setCommentId(commentId);
        row.setUserId(userId);
        workCommentLikeRepository.save(row);
        c.setLikeCount(c.getLikeCount() + 1);
        workCommentRepository.save(c);
        return loadSingleDto(c, userId);
    }

    @Transactional
    public WorkCommentDto unlikeComment(Long workId, Long commentId, Integer userId) {
        WorkComment c = loadActiveComment(workId, commentId);
        if (!workCommentLikeRepository.existsByCommentIdAndUserId(commentId, userId)) {
            return loadSingleDto(c, userId);
        }
        workCommentLikeRepository.deleteByCommentIdAndUserId(commentId, userId);
        c.setLikeCount(Math.max(0, c.getLikeCount() - 1));
        workCommentRepository.save(c);
        return loadSingleDto(c, userId);
    }

    @Transactional
    public void deleteOwnComment(Long workId, Long commentId, Integer userId) {
        WorkComment c = loadActiveComment(workId, commentId);
        if (!Objects.equals(c.getUserId(), userId)) {
            throw new ApiException(403, "只能删除自己的评论");
        }
        c.setStatus(0);
        c.setBody("该评论已删除");
        workCommentRepository.save(c);
    }

    public long countComments(Long workId) {
        return workCommentRepository.countByWorkIdAndStatus(workId, STATUS_ACTIVE);
    }

    private WorkComment loadActiveComment(Long workId, Long commentId) {
        WorkComment c = workCommentRepository.findById(commentId).orElseThrow(() -> new ApiException(404, "评论不存在"));
        if (!Objects.equals(c.getWorkId(), workId) || c.getStatus() != STATUS_ACTIVE) {
            throw new ApiException(404, "评论不存在");
        }
        return c;
    }

    private WorkCommentDto loadSingleDto(WorkComment c, Integer viewerUserId) {
        User author = authService.assignPublicIdIfMissing(
                userReposity.findById(c.getUserId()).orElseThrow(() -> new ApiException(404, "用户不存在")));
        Set<Long> liked =
                workCommentLikeRepository.existsByCommentIdAndUserId(c.getCommentId(), viewerUserId)
                        ? Set.of(c.getCommentId())
                        : Set.of();
        return toDto(c, Map.of(author.getUserId(), author), liked, List.of());
    }

    private void ensureWorkVisible(Long workId, Optional<Integer> viewerUserId) {
        Work w = workRepository.findById(workId).orElseThrow(() -> new ApiException(404, "作品不存在"));
        if (w.getStatus() != 1) {
            boolean owner = viewerUserId.map(id -> id.equals(w.getUserId())).orElse(false);
            if (!owner) {
                throw new ApiException(404, "作品不存在");
            }
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

    private WorkCommentDto freezeCommentNode(WorkCommentDto node) {
        List<WorkCommentDto> frozenReplies = node.replies().stream().map(this::freezeCommentNode).collect(Collectors.toList());
        return copyWithReplies(node, frozenReplies);
    }

    private static WorkCommentDto copyWithReplies(WorkCommentDto n, List<WorkCommentDto> replies) {
        return new WorkCommentDto(
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

    private static WorkCommentDto copyWithReplyTo(WorkCommentDto n, String replyToAuthorName) {
        return new WorkCommentDto(
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

    private WorkCommentDto toDto(
            WorkComment c, Map<Integer, User> authorById, Set<Long> likedIds, List<WorkCommentDto> replies) {
        User author = authorById.get(c.getUserId());
        String name = author != null ? author.getUserName() : "用户";
        Long publicId = author != null ? author.getPublicId() : null;
        String avatar = author != null ? buildAvatarUrl(author.getAvatarPath()) : null;
        Boolean liked = likedIds.isEmpty() ? null : likedIds.contains(c.getCommentId());
        return new WorkCommentDto(
                c.getCommentId(),
                c.getParentId(),
                c.getRootId(),
                publicId,
                name,
                avatar,
                null,
                c.getBody(),
                c.getLikeCount(),
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
