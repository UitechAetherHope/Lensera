package com.photoblog.springboot_photo.service;

import com.photoblog.springboot_photo.pojo.BlogComment;
import com.photoblog.springboot_photo.pojo.BlogPost;
import com.photoblog.springboot_photo.pojo.User;
import com.photoblog.springboot_photo.pojo.Work;
import com.photoblog.springboot_photo.pojo.WorkComment;
import com.photoblog.springboot_photo.pojo.dto.InboxMessageDto;
import com.photoblog.springboot_photo.repostity.BlogCommentRepository;
import com.photoblog.springboot_photo.repostity.BlogPostRepository;
import com.photoblog.springboot_photo.repostity.UserReposity;
import com.photoblog.springboot_photo.repostity.WorkCommentRepository;
import com.photoblog.springboot_photo.repostity.WorkRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserInboxService {

    private static final int STATUS_PUBLISHED_WORK = 1;
    private static final int STATUS_PUBLISHED_BLOG = 2;
    private static final int PREVIEW_MAX = 240;
    private static final int PER_SOURCE_LIMIT = 60;
    private static final int MERGED_LIMIT = 100;

    private final WorkRepository workRepository;
    private final WorkCommentRepository workCommentRepository;
    private final BlogPostRepository blogPostRepository;
    private final BlogCommentRepository blogCommentRepository;
    private final UserReposity userReposity;
    private final AuthService authService;

    @Value("${app.public-base-url:http://localhost:8080}")
    private String publicBaseUrl;

    public UserInboxService(
            WorkRepository workRepository,
            WorkCommentRepository workCommentRepository,
            BlogPostRepository blogPostRepository,
            BlogCommentRepository blogCommentRepository,
            UserReposity userReposity,
            AuthService authService) {
        this.workRepository = workRepository;
        this.workCommentRepository = workCommentRepository;
        this.blogPostRepository = blogPostRepository;
        this.blogCommentRepository = blogCommentRepository;
        this.userReposity = userReposity;
        this.authService = authService;
    }

    public List<InboxMessageDto> listIncomingMessages(Integer ownerUserId) {
        List<InboxMessageDto> merged = new ArrayList<>();
        merged.addAll(loadWorkMessages(ownerUserId));
        merged.addAll(loadBlogMessages(ownerUserId));
        merged.sort(Comparator.comparingLong(InboxMessageDto::createdAtEpochMs).reversed());
        if (merged.size() > MERGED_LIMIT) {
            return merged.subList(0, MERGED_LIMIT);
        }
        return merged;
    }

    private List<InboxMessageDto> loadWorkMessages(Integer ownerUserId) {
        List<Work> myWorks =
                workRepository.findByUserIdAndStatusOrderByCreatedAtDesc(ownerUserId, STATUS_PUBLISHED_WORK);
        if (myWorks.isEmpty()) {
            return List.of();
        }
        Map<Long, Work> workById =
                myWorks.stream().collect(Collectors.toMap(Work::getWorkId, w -> w, (a, b) -> a));
        List<Long> workIds = new ArrayList<>(workById.keySet());
        List<WorkComment> comments =
                workCommentRepository.findIncomingOnWorks(
                        workIds, ownerUserId, PageRequest.of(0, PER_SOURCE_LIMIT));
        if (comments.isEmpty()) {
            return List.of();
        }
        Map<Integer, User> commenters = loadUsers(
                comments.stream().map(WorkComment::getUserId).collect(Collectors.toSet()));
        String base = normalizedBaseUrl();
        List<InboxMessageDto> out = new ArrayList<>();
        for (WorkComment c : comments) {
            Work w = workById.get(c.getWorkId());
            if (w == null) {
                continue;
            }
            User commenter = commenters.get(c.getUserId());
            if (commenter == null) {
                continue;
            }
            String imageUrl = toPublicUrl(base, w.getImagePath());
            out.add(
                    new InboxMessageDto(
                            "work",
                            c.getCommentId(),
                            w.getWorkId(),
                            w.getTitle() != null ? w.getTitle() : "作品",
                            imageUrl,
                            commenter.getPublicId(),
                            commenter.getUserName(),
                            toPublicUrl(base, commenter.getAvatarPath()),
                            previewBody(c.getBody()),
                            epochMs(c.getCreatedAt())));
        }
        return out;
    }

    private List<InboxMessageDto> loadBlogMessages(Integer ownerUserId) {
        List<BlogPost> myPosts =
                blogPostRepository.findByUserIdAndStatusOrderByPublishedAtDescUpdatedAtDesc(
                        ownerUserId, STATUS_PUBLISHED_BLOG);
        if (myPosts.isEmpty()) {
            return List.of();
        }
        Map<Long, BlogPost> postById =
                myPosts.stream().collect(Collectors.toMap(BlogPost::getBlogId, p -> p, (a, b) -> a));
        List<Long> blogIds = new ArrayList<>(postById.keySet());
        List<BlogComment> comments =
                blogCommentRepository.findIncomingOnBlogs(
                        blogIds, ownerUserId, PageRequest.of(0, PER_SOURCE_LIMIT));
        if (comments.isEmpty()) {
            return List.of();
        }
        Map<Integer, User> commenters = loadUsers(
                comments.stream().map(BlogComment::getUserId).collect(Collectors.toSet()));
        String base = normalizedBaseUrl();
        List<InboxMessageDto> out = new ArrayList<>();
        for (BlogComment c : comments) {
            BlogPost p = postById.get(c.getBlogId());
            if (p == null) {
                continue;
            }
            User commenter = commenters.get(c.getUserId());
            if (commenter == null) {
                continue;
            }
            out.add(
                    new InboxMessageDto(
                            "blog",
                            c.getCommentId(),
                            p.getBlogId(),
                            p.getTitle() != null ? p.getTitle() : "博客",
                            toPublicUrl(base, p.getCoverPath()),
                            commenter.getPublicId(),
                            commenter.getUserName(),
                            toPublicUrl(base, commenter.getAvatarPath()),
                            previewBody(c.getBody()),
                            epochMs(c.getCreatedAt())));
        }
        return out;
    }

    private Map<Integer, User> loadUsers(Set<Integer> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        Map<Integer, User> map = new HashMap<>();
        for (User u : userReposity.findByUserIdIn(userIds)) {
            map.put(u.getUserId(), authService.assignPublicIdIfMissing(u));
        }
        return map;
    }

    private String normalizedBaseUrl() {
        return publicBaseUrl.endsWith("/")
                ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1)
                : publicBaseUrl;
    }

    private static String toPublicUrl(String base, String relative) {
        if (relative == null || relative.isBlank()) {
            return "";
        }
        String p = relative.trim().replace('\\', '/');
        if (p.contains("..")) {
            return "";
        }
        return base + "/files/" + p;
    }

    private static String previewBody(String body) {
        if (body == null) {
            return "";
        }
        String t = body.trim().replaceAll("\\s+", " ");
        if (t.length() <= PREVIEW_MAX) {
            return t;
        }
        return t.substring(0, PREVIEW_MAX) + "\u2026";
    }

    private static long epochMs(java.time.Instant instant) {
        return instant != null ? instant.toEpochMilli() : 0L;
    }
}
