package com.photoblog.springboot_photo.controller;

import com.photoblog.springboot_photo.pojo.ResponseMessage;
import com.photoblog.springboot_photo.pojo.dto.BlogAssetUploadResponse;
import com.photoblog.springboot_photo.pojo.dto.BlogPostListItemResponse;
import com.photoblog.springboot_photo.pojo.dto.BlogPostResponse;
import com.photoblog.springboot_photo.pojo.dto.MarkdownConvertRequest;
import com.photoblog.springboot_photo.pojo.dto.MarkdownConvertResponse;
import com.photoblog.springboot_photo.service.BlogPostService;
import com.photoblog.springboot_photo.service.PlainTextToMarkdownService;
import com.photoblog.springboot_photo.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Optional;

@RestController
public class BlogPostController {

    private static final Logger log = LoggerFactory.getLogger(BlogPostController.class);

    private final JwtUtil jwtUtil;
    private final BlogPostService blogPostService;
    private final PlainTextToMarkdownService plainTextToMarkdownService;

    public BlogPostController(
            JwtUtil jwtUtil,
            BlogPostService blogPostService,
            PlainTextToMarkdownService plainTextToMarkdownService) {
        this.jwtUtil = jwtUtil;
        this.blogPostService = blogPostService;
        this.plainTextToMarkdownService = plainTextToMarkdownService;
    }

    @GetMapping("/api/blog-posts/mine")
    public ResponseMessage<List<BlogPostListItemResponse>> listMine(
            @RequestHeader("Authorization") String authorization) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        return ResponseMessage.success(blogPostService.listMine(uid));
    }

    /**
     * 全站已发布博客流（博客页卡片列表）。
     * sort: latest（最新发布）| popular（浏览最多）| discussed（讨论最热）
     */
    @GetMapping("/api/blog-posts/feed")
    public ResponseMessage<List<BlogPostListItemResponse>> feed(
            @RequestParam(value = "sort", defaultValue = "latest") String sort) {
        return ResponseMessage.success(blogPostService.listPublishedFeed(sort));
    }

    @GetMapping("/api/blog-posts")
    public ResponseMessage<List<BlogPostListItemResponse>> listByPublicId(@RequestParam("publicId") Long publicId) {
        return ResponseMessage.success(blogPostService.listPublishedByPublicId(publicId));
    }

    /** 记录一次有效阅读（去重）；已发布文章可用 */
    @PostMapping("/api/blog-posts/{blogId:\\d+}/view")
    public ResponseMessage<Void> recordView(
            @PathVariable Long blogId,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest request) {
        Optional<Integer> viewer = jwtUtil.parseUserIdOptional(authorization);
        blogPostService.recordViewOnly(blogId, viewer.orElse(null), resolveClientIp(request));
        return ResponseMessage.success(null);
    }

    /** blogId 仅匹配数字，避免 /feed、/mine 等路径被误解析 */
    @GetMapping("/api/blog-posts/{blogId:\\d+}")
    public ResponseMessage<BlogPostResponse> getOne(
            @PathVariable Long blogId,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest request) {
        Optional<Integer> viewer = jwtUtil.parseUserIdOptional(authorization);
        return ResponseMessage.success(
                blogPostService.getPost(blogId, viewer.orElse(null), resolveClientIp(request)));
    }

    private static String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return "";
        }
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int comma = xff.indexOf(',');
            return (comma > 0 ? xff.substring(0, comma) : xff).trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "";
    }

    /**
     * 将粘贴的纯文本 / AI 文稿转为 Markdown（需登录，与发博客同一鉴权）。
     */
    @PostMapping("/api/blog-posts/convert-markdown")
    public ResponseMessage<MarkdownConvertResponse> convertMarkdown(
            @RequestHeader("Authorization") String authorization,
            @RequestBody MarkdownConvertRequest body) {
        jwtUtil.parseUserIdFromAuthorization(authorization);
        String text = body != null && body.text() != null ? body.text() : "";
        String markdown = plainTextToMarkdownService.convert(text);
        return ResponseMessage.success(new MarkdownConvertResponse(markdown));
    }

    /** Markdown 正文内嵌图：写入 users/{publicId}/blog/assets/{yyyy}/{MM}/ */
    @PostMapping(value = "/api/blog-posts/assets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseMessage<BlogAssetUploadResponse> uploadAsset(
            @RequestHeader("Authorization") String authorization, @RequestPart("file") MultipartFile file) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        return ResponseMessage.success(blogPostService.uploadAsset(uid, file));
    }

  /**
   * 创建博客：multipart — title、category、tags、excerpt、bodyMarkdown、status(draft|pending|published)、
   * cover(可选，发布时必填)。
   */
    @PostMapping(value = "/api/blog-posts", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseMessage<BlogPostResponse> create(
            @RequestHeader("Authorization") String authorization,
            @RequestParam("title") String title,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "tags", required = false) String tags,
            @RequestParam(value = "excerpt", required = false) String excerpt,
            @RequestParam(value = "bodyMarkdown", required = false) String bodyMarkdown,
            @RequestParam(value = "status", defaultValue = "draft") String status,
            @RequestPart(value = "cover", required = false) MultipartFile cover) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        log.info("POST /api/blog-posts userId={} title={} status={}", uid, title, status);
        return ResponseMessage.success(
                blogPostService.createPost(uid, title, category, tags, excerpt, bodyMarkdown, status, cover));
    }

    @PatchMapping(value = "/api/blog-posts/{blogId:\\d+}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseMessage<BlogPostResponse> update(
            @RequestHeader("Authorization") String authorization,
            @PathVariable Long blogId,
            @RequestParam("title") String title,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "tags", required = false) String tags,
            @RequestParam(value = "excerpt", required = false) String excerpt,
            @RequestParam(value = "bodyMarkdown", required = false) String bodyMarkdown,
            @RequestParam(value = "status", defaultValue = "draft") String status,
            @RequestPart(value = "cover", required = false) MultipartFile cover) {
        Integer uid = jwtUtil.parseUserIdFromAuthorization(authorization);
        log.info("PATCH /api/blog-posts/{} userId={} status={}", blogId, uid, status);
        return ResponseMessage.success(
                blogPostService.updatePost(uid, blogId, title, category, tags, excerpt, bodyMarkdown, status, cover));
    }
}
