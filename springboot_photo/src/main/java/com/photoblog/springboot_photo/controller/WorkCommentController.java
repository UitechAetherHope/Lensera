package com.photoblog.springboot_photo.controller;

import com.photoblog.springboot_photo.pojo.ResponseMessage;
import com.photoblog.springboot_photo.pojo.dto.WorkCommentDto;
import com.photoblog.springboot_photo.service.WorkCommentService;
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
public class WorkCommentController {

    private final JwtUtil jwtUtil;
    private final WorkCommentService workCommentService;

    public WorkCommentController(JwtUtil jwtUtil, WorkCommentService workCommentService) {
        this.jwtUtil = jwtUtil;
        this.workCommentService = workCommentService;
    }

    @GetMapping("/api/works/{workId}/comments")
    public ResponseMessage<List<WorkCommentDto>> list(
            @PathVariable Long workId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<Integer> viewer = jwtUtil.parseUserIdOptional(authorization);
        return ResponseMessage.success(workCommentService.listCommentTree(workId, viewer));
    }

    @PostMapping("/api/works/{workId}/comments")
    public ResponseMessage<WorkCommentDto> create(
            @PathVariable Long workId,
            @RequestHeader("Authorization") String authorization,
            @RequestBody Map<String, Object> body) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        String content = body.get("content") != null ? String.valueOf(body.get("content")) : "";
        Long parentId = null;
        Object pid = body.get("parentId");
        if (pid != null && !String.valueOf(pid).isBlank()) {
            parentId = Long.valueOf(String.valueOf(pid));
        }
        return ResponseMessage.success(workCommentService.createComment(workId, uid, content, parentId));
    }

    @PostMapping("/api/works/{workId}/comments/{commentId}/like")
    public ResponseMessage<WorkCommentDto> like(
            @PathVariable Long workId,
            @PathVariable Long commentId,
            @RequestHeader("Authorization") String authorization) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        return ResponseMessage.success(workCommentService.likeComment(workId, commentId, uid));
    }

    @DeleteMapping("/api/works/{workId}/comments/{commentId}/like")
    public ResponseMessage<WorkCommentDto> unlike(
            @PathVariable Long workId,
            @PathVariable Long commentId,
            @RequestHeader("Authorization") String authorization) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        return ResponseMessage.success(workCommentService.unlikeComment(workId, commentId, uid));
    }

    @DeleteMapping("/api/works/{workId}/comments/{commentId}")
    public ResponseMessage<Void> delete(
            @PathVariable Long workId,
            @PathVariable Long commentId,
            @RequestHeader("Authorization") String authorization) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        workCommentService.deleteOwnComment(workId, commentId, uid);
        return ResponseMessage.success();
    }
}
