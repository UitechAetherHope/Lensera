package com.photoblog.springboot_photo.controller;

import com.photoblog.springboot_photo.pojo.ResponseMessage;
import com.photoblog.springboot_photo.pojo.dto.BlogCommentDto;
import com.photoblog.springboot_photo.service.BlogCommentService;
import com.photoblog.springboot_photo.util.JwtUtil;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
public class BlogCommentController {

    private final JwtUtil jwtUtil;
    private final BlogCommentService blogCommentService;

    public BlogCommentController(JwtUtil jwtUtil, BlogCommentService blogCommentService) {
        this.jwtUtil = jwtUtil;
        this.blogCommentService = blogCommentService;
    }

    @GetMapping("/api/blog-posts/{blogId:\\d+}/comments")
    public ResponseMessage<List<BlogCommentDto>> list(
            @PathVariable Long blogId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<Integer> viewer = jwtUtil.parseUserIdOptional(authorization);
        return ResponseMessage.success(blogCommentService.listCommentTree(blogId, viewer));
    }

    @PostMapping("/api/blog-posts/{blogId:\\d+}/comments")
    public ResponseMessage<BlogCommentDto> create(
            @PathVariable Long blogId,
            @RequestHeader("Authorization") String authorization,
            @RequestBody Map<String, Object> body) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        String content = body.get("content") != null ? String.valueOf(body.get("content")) : "";
        Long parentId = null;
        Object pid = body.get("parentId");
        if (pid != null && !String.valueOf(pid).isBlank()) {
            parentId = Long.valueOf(String.valueOf(pid));
        }
        return ResponseMessage.success(blogCommentService.createComment(blogId, uid, content, parentId));
    }

    @PostMapping("/api/blog-posts/{blogId:\\d+}/comments/{commentId}/like")
    public ResponseMessage<BlogCommentDto> like(
            @PathVariable Long blogId,
            @PathVariable Long commentId,
            @RequestHeader("Authorization") String authorization) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        return ResponseMessage.success(blogCommentService.likeComment(blogId, commentId, uid));
    }

    @DeleteMapping("/api/blog-posts/{blogId:\\d+}/comments/{commentId}/like")
    public ResponseMessage<BlogCommentDto> unlike(
            @PathVariable Long blogId,
            @PathVariable Long commentId,
            @RequestHeader("Authorization") String authorization) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        return ResponseMessage.success(blogCommentService.unlikeComment(blogId, commentId, uid));
    }

    @DeleteMapping("/api/blog-posts/{blogId:\\d+}/comments/{commentId}")
    public ResponseMessage<Void> delete(
            @PathVariable Long blogId,
            @PathVariable Long commentId,
            @RequestHeader("Authorization") String authorization) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        blogCommentService.deleteOwnComment(blogId, commentId, uid);
        return ResponseMessage.success();
    }
}
