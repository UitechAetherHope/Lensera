package com.photoblog.springboot_photo.controller;

import com.photoblog.springboot_photo.pojo.ResponseMessage;
import com.photoblog.springboot_photo.pojo.dto.WorkFeedCardResponse;
import com.photoblog.springboot_photo.pojo.dto.WorkListItemResponse;
import com.photoblog.springboot_photo.pojo.dto.WorkResponse;
import com.photoblog.springboot_photo.service.WorkService;
import com.photoblog.springboot_photo.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

@RestController
public class WorkController {

    private static final Logger log = LoggerFactory.getLogger(WorkController.class);

    private final JwtUtil jwtUtil;
    private final WorkService workService;

    public WorkController(JwtUtil jwtUtil, WorkService workService) {
        this.jwtUtil = jwtUtil;
        this.workService = workService;
    }

    /** 当前用户全部作品（含草稿）；须写在 /api/works/{id} 之前避免被当成 id */
    @GetMapping("/api/works/mine")
    public ResponseMessage<List<WorkListItemResponse>> listMine(@RequestHeader("Authorization") String authorization) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        return ResponseMessage.success(workService.listMine(uid));
    }

    /** 按作者 publicId 列出已发布作品（可选登录：likedByMe） */
    @GetMapping("/api/works")
    public ResponseMessage<List<WorkListItemResponse>> listByPublicId(
            @RequestParam("publicId") Long publicId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<Integer> viewer = jwtUtil.parseUserIdOptional(authorization);
        return ResponseMessage.success(workService.listPublishedByPublicId(publicId, viewer));
    }

    /**
     * 全站已发布作品流（极简卡片字段）；可选 category 筛选手选五类。
     */
    @GetMapping("/api/works/feed")
    public ResponseMessage<List<WorkFeedCardResponse>> feed(
            @RequestParam(value = "category", required = false) String category,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<Integer> viewer = jwtUtil.parseUserIdOptional(authorization);
        return ResponseMessage.success(workService.listPublishedFeed(category, viewer));
    }

    @GetMapping("/api/works/{workId}")
    public ResponseMessage<WorkResponse> getOne(
            @PathVariable Long workId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Optional<Integer> viewer = jwtUtil.parseUserIdOptional(authorization);
        return ResponseMessage.success(workService.getWork(workId, viewer));
    }

    /** 作者重跑该作品的 AI 分类（用于此前未写入 AI 列或想更新规则后的结果） */
    @PostMapping("/api/works/{workId}/classify-ai")
    public ResponseMessage<WorkResponse> reclassify(
            @PathVariable Long workId, @RequestHeader("Authorization") String authorization) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        return ResponseMessage.success(workService.requestAiReclassify(uid, workId));
    }

    /**
     * 上传作品：multipart — file、title、caption(可选)、category（可选；仅白名单五类，未传则不入库分类）、
     * aiClassify（可选，默认 false；为 true 时按 app.vision 配置调用云端视觉 API 自动打五类标签）。
     */
    @PostMapping(value = "/api/works", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseMessage<WorkResponse> create(
            @RequestHeader("Authorization") String authorization,
            @RequestPart("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "caption", required = false) String caption,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "aiClassify", defaultValue = "false") boolean aiClassify) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        log.info("POST /api/works userId={} title={} aiClassify={}", uid, title, aiClassify);
        return ResponseMessage.success(workService.createWork(uid, title, caption, category, aiClassify, file));
    }

    /**
     * 修改作品：multipart — title、caption(可选)、category(可选)、aiClassify(可选)、file(可选，不传则保留原图)。
     */
    @PatchMapping(value = "/api/works/{workId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseMessage<WorkResponse> update(
            @RequestHeader("Authorization") String authorization,
            @PathVariable Long workId,
            @RequestParam("title") String title,
            @RequestParam(value = "caption", required = false) String caption,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "aiClassify", defaultValue = "false") boolean aiClassify,
            @RequestPart(value = "file", required = false) MultipartFile file) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        log.info("PATCH /api/works/{} userId={}", workId, uid);
        return ResponseMessage.success(workService.updateWork(uid, workId, title, caption, category, aiClassify, file));
    }

    @PostMapping("/api/works/{workId}/like")
    public ResponseMessage<WorkResponse> like(
            @PathVariable Long workId,
            @RequestHeader("Authorization") String authorization) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        return ResponseMessage.success(workService.like(workId, uid));
    }

    @DeleteMapping("/api/works/{workId}/like")
    public ResponseMessage<WorkResponse> unlike(
            @PathVariable Long workId,
            @RequestHeader("Authorization") String authorization) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        return ResponseMessage.success(workService.unlike(workId, uid));
    }

    /** 删除作品（仅作者）；须写在 /api/works/{id}/like 之后语义上并列，路径无子路径冲突 */
    @DeleteMapping("/api/works/{workId}")
    public ResponseMessage<Void> delete(
            @PathVariable Long workId,
            @RequestHeader("Authorization") String authorization) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        log.info("DELETE /api/works/{} userId={}", workId, uid);
        workService.deleteWork(uid, workId);
        return ResponseMessage.success();
    }
}
