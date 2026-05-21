package com.photoblog.springboot_photo.service;

import com.photoblog.springboot_photo.exception.ApiException;
import com.photoblog.springboot_photo.pojo.BlogPost;
import com.photoblog.springboot_photo.pojo.User;
import com.photoblog.springboot_photo.pojo.dto.BlogAssetUploadResponse;
import com.photoblog.springboot_photo.pojo.dto.BlogPostListItemResponse;
import com.photoblog.springboot_photo.pojo.dto.BlogPostResponse;
import com.photoblog.springboot_photo.repostity.BlogPostRepository;
import com.photoblog.springboot_photo.repostity.UserReposity;
import com.photoblog.springboot_photo.util.ProfileImageCompressor;
import com.photoblog.springboot_photo.util.UserUploadPaths;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class BlogPostService {

    private static final Logger log = LoggerFactory.getLogger(BlogPostService.class);

    private static final Set<String> ALLOWED_CONTENT = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif");

    private static final Set<String> ALLOWED_CATEGORY = Set.of(
            "技术分享", "器材资讯", "社区新闻", "后期教程", "行业动态");

    private static final Set<String> ALLOWED_STATUS = Set.of("draft", "pending", "published");

    private static final int STATUS_DRAFT = 0;
    private static final int STATUS_PENDING = 1;
    private static final int STATUS_PUBLISHED = 2;
    private static final int STATUS_REJECTED = 3;

    private static final DateTimeFormatter CARD_DATE =
            DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneId.systemDefault());

    /** Markdown 正文里 ![alt](users/...) → ![alt](/files/users/...) 便于 Nginx 同源访问 */
    private static final Pattern MARKDOWN_USERS_IMG =
            Pattern.compile("!\\[([^\\]]*)\\]\\((users/[^)]+)\\)");

    private final BlogPostRepository blogPostRepository;
    private final UserReposity userReposity;
    private final AuthService authService;
    private final BlogStatsService blogStatsService;

    @Value("${app.upload.root:./data/upload-root}")
    private String uploadRoot;

    @Value("${app.public-base-url:http://localhost:8080}")
    private String publicBaseUrl;

    public BlogPostService(
            BlogPostRepository blogPostRepository,
            UserReposity userReposity,
            AuthService authService,
            BlogStatsService blogStatsService) {
        this.blogPostRepository = blogPostRepository;
        this.userReposity = userReposity;
        this.authService = authService;
        this.blogStatsService = blogStatsService;
    }

    @Transactional
    public BlogAssetUploadResponse uploadAsset(Integer userId, MultipartFile file) {
        return saveImage(userId, file, UserUploadPaths.blogAssetsMonthDirectory(resolvePublicId(userId), Instant.now()), true);
    }

    @Transactional
    public BlogPostResponse createPost(
            Integer userId,
            String title,
            String category,
            String tagsRaw,
            String excerpt,
            String bodyMarkdown,
            String statusRaw,
            MultipartFile coverFile) {
        User author = userReposity.findById(userId).orElseThrow(() -> new ApiException(404, "用户不存在"));
        author = authService.assignPublicIdIfMissing(author);
        Long publicId = author.getPublicId();
        if (publicId == null) {
            throw new ApiException(500, "用户对外 ID 未就绪");
        }

        String safeTitle = trimMax(title, 200, "标题不能为空", "标题过长");
        String cat = normalizeCategory(category);
        String excerptSafe = trimMaxNullable(excerpt, 2000, "摘要过长");
        String body = bodyMarkdown != null ? bodyMarkdown.trim() : "";
        if (body.length() > 200_000) {
            throw new ApiException(400, "正文过长");
        }
        int status = parseStatus(statusRaw);
        if (status == STATUS_PUBLISHED && body.isEmpty()) {
            throw new ApiException(400, "发布前请填写 Markdown 正文");
        }
        if (status == STATUS_PUBLISHED && coverFile == null) {
            throw new ApiException(400, "发布前请上传卡片封面");
        }

        String coverRelative = null;
        String coverName = null;
        Long coverSize = null;
        String coverMime = null;
        if (coverFile != null && !coverFile.isEmpty()) {
            BlogAssetUploadResponse saved =
                    saveImage(userId, coverFile, UserUploadPaths.blogCoversMonthDirectory(publicId, Instant.now()), false);
            coverRelative = saved.relativePath();
            coverName = coverFile.getOriginalFilename();
            coverSize = coverFile.getSize();
            coverMime = coverFile.getContentType();
        }

        BlogPost post = new BlogPost();
        post.setUserId(userId);
        post.setTitle(safeTitle);
        post.setCategory(cat);
        post.setTags(normalizeTags(tagsRaw));
        post.setExcerpt(excerptSafe);
        post.setBodyMarkdown(body.isEmpty() ? null : body);
        post.setCoverPath(coverRelative);
        post.setCoverName(coverName);
        post.setCoverByteSize(coverSize);
        post.setCoverMime(coverMime);
        post.setStatus(status);
        post.setViewCount(0);
        post.setCommentCount(0);
        if (status == STATUS_PUBLISHED) {
            post.setPublishedAt(Instant.now());
        } else if (status == STATUS_PENDING) {
            post.setPublishedAt(null);
        }

        BlogPost saved = blogPostRepository.save(post);
        log.info("blog created blogId={} userId={} status={}", saved.getBlogId(), userId, status);
        return toDetail(saved, author);
    }

    @Transactional
    public BlogPostResponse updatePost(
            Integer userId,
            Long blogId,
            String title,
            String category,
            String tagsRaw,
            String excerpt,
            String bodyMarkdown,
            String statusRaw,
            MultipartFile coverFile) {
        BlogPost post = blogPostRepository.findById(blogId).orElseThrow(() -> new ApiException(404, "博客不存在"));
        if (!userId.equals(post.getUserId())) {
            throw new ApiException(403, "无权修改该博客");
        }
        User author = userReposity.findById(userId).orElseThrow(() -> new ApiException(404, "用户不存在"));

        String safeTitle = trimMax(title, 200, "标题不能为空", "标题过长");
        String cat = normalizeCategory(category);
        String excerptSafe = trimMaxNullable(excerpt, 2000, "摘要过长");
        String body = bodyMarkdown != null ? bodyMarkdown.trim() : "";
        if (body.length() > 200_000) {
            throw new ApiException(400, "正文过长");
        }
        int status = parseStatus(statusRaw);
        if (status == STATUS_PUBLISHED && body.isEmpty()) {
            throw new ApiException(400, "发布前请填写 Markdown 正文");
        }
        boolean hasCover = post.getCoverPath() != null && !post.getCoverPath().isBlank();
        if (status == STATUS_PUBLISHED && !hasCover && (coverFile == null || coverFile.isEmpty())) {
            throw new ApiException(400, "发布前请上传卡片封面");
        }

        if (coverFile != null && !coverFile.isEmpty()) {
            Long publicId = resolvePublicId(userId);
            BlogAssetUploadResponse saved =
                    saveImage(userId, coverFile, UserUploadPaths.blogCoversMonthDirectory(publicId, Instant.now()), false);
            post.setCoverPath(saved.relativePath());
            post.setCoverName(coverFile.getOriginalFilename());
            post.setCoverByteSize(coverFile.getSize());
            post.setCoverMime(coverFile.getContentType());
        }

        post.setTitle(safeTitle);
        post.setCategory(cat);
        post.setTags(normalizeTags(tagsRaw));
        post.setExcerpt(excerptSafe);
        post.setBodyMarkdown(body.isEmpty() ? null : body);
        int prevStatus = post.getStatus();
        post.setStatus(status);
        if (status == STATUS_PUBLISHED && post.getPublishedAt() == null) {
            post.setPublishedAt(Instant.now());
        } else if (status != STATUS_PUBLISHED && prevStatus == STATUS_PUBLISHED) {
            post.setPublishedAt(null);
        }

        BlogPost saved = blogPostRepository.save(post);
        log.info("blog updated blogId={} userId={} status={}", saved.getBlogId(), userId, status);
        return toDetail(saved, author);
    }

    public List<BlogPostListItemResponse> listMine(Integer userId) {
        User author = userReposity.findById(userId).orElseThrow(() -> new ApiException(404, "用户不存在"));
        return blogPostRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream()
                .map(p -> toListItem(p, author))
                .collect(Collectors.toList());
    }

    /** @param sort latest | popular | discussed */
    public List<BlogPostListItemResponse> listPublishedFeed(String sort) {
        List<BlogPost> posts =
                switch (normalizeFeedSort(sort)) {
                    case "popular" ->
                            blogPostRepository.findByStatusOrderByViewCountDescPublishedAtDescUpdatedAtDesc(
                                    STATUS_PUBLISHED);
                    case "discussed" ->
                            blogPostRepository.findByStatusOrderByCommentCountDescPublishedAtDescUpdatedAtDesc(
                                    STATUS_PUBLISHED);
                    default ->
                            blogPostRepository.findByStatusOrderByPublishedAtDescUpdatedAtDesc(STATUS_PUBLISHED);
                };
        return posts.stream()
                .map(p -> {
                    User author =
                            userReposity.findById(p.getUserId()).orElseThrow(() -> new ApiException(500, "作者数据异常"));
                    return toListItem(p, author);
                })
                .collect(Collectors.toList());
    }

    private static String normalizeFeedSort(String sort) {
        if (sort == null) {
            return "latest";
        }
        return switch (sort.trim().toLowerCase(Locale.ROOT)) {
            case "popular", "views" -> "popular";
            case "discussed", "comments" -> "discussed";
            default -> "latest";
        };
    }

    public List<BlogPostListItemResponse> listPublishedByPublicId(Long publicId) {
        User author =
                userReposity.findByPublicId(publicId).orElseThrow(() -> new ApiException(404, "用户不存在"));
        return blogPostRepository
                .findByUserIdAndStatusOrderByPublishedAtDescUpdatedAtDesc(author.getUserId(), STATUS_PUBLISHED)
                .stream()
                .map(p -> toListItem(p, author))
                .collect(Collectors.toList());
    }

    /** 仅记录阅读（供前端显式上报，与 getPost 内逻辑一致） */
    public void recordViewOnly(Long blogId, Integer viewerUserId, String clientIp) {
        BlogPost post = blogPostRepository.findById(blogId).orElseThrow(() -> new ApiException(404, "博客不存在"));
        if (post.getStatus() != STATUS_PUBLISHED) {
            return;
        }
        blogStatsService.recordView(blogId, viewerUserId, clientIp);
    }

    public BlogPostResponse getPost(Long blogId, Integer viewerUserId, String clientIp) {
        BlogPost post = blogPostRepository.findById(blogId).orElseThrow(() -> new ApiException(404, "博客不存在"));
        User author =
                userReposity.findById(post.getUserId()).orElseThrow(() -> new ApiException(404, "作者不存在"));
        boolean owner = viewerUserId != null && viewerUserId.equals(post.getUserId());
        if (post.getStatus() != STATUS_PUBLISHED && !owner) {
            throw new ApiException(404, "博客不存在或未发布");
        }
        if (post.getStatus() == STATUS_PUBLISHED) {
            blogStatsService.recordView(post.getBlogId(), viewerUserId, clientIp);
            post = blogPostRepository.findById(blogId).orElse(post);
        }
        return toDetail(post, author);
    }

    private int resolveDisplayViewCount(BlogPost post) {
        return blogStatsService.displayViewCount(post.getViewCount(), post.getBlogId());
    }

    private BlogAssetUploadResponse saveImage(
            Integer userId, MultipartFile file, String subDir, boolean assetNotCover) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(400, "请选择图片文件");
        }
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase(Locale.ROOT) : "";
        if (!ALLOWED_CONTENT.contains(contentType)) {
            throw new ApiException(400, "仅支持 jpg / png / webp / gif");
        }

        Path root = ensureUploadRoot();
        Path monthDir = root.resolve(subDir).normalize();
        String baseName = UserUploadPaths.uniqueFileBaseName();
        String relative;
        try {
            Files.createDirectories(monthDir);
            byte[] bytes = file.getBytes();
            if (bytes.length > 45 * 1024 * 1024) {
                throw new ApiException(400, "图片过大（超过 45MB）");
            }
            String savedName =
                    assetNotCover
                            ? ProfileImageCompressor.saveBlogAsset(bytes, contentType, monthDir, baseName)
                            : ProfileImageCompressor.saveCover(bytes, contentType, monthDir, baseName);
            relative = subDir.replace('\\', '/') + "/" + savedName;
            Path dest = monthDir.resolve(savedName).normalize();
            if (!dest.startsWith(root)) {
                throw new ApiException(500, "非法保存路径");
            }
        } catch (ApiException e) {
            throw e;
        } catch (IOException e) {
            log.error("保存博客图片失败 dir={}", monthDir, e);
            throw new ApiException(500, "保存文件失败");
        }
        return new BlogAssetUploadResponse(relative, toPublicUrl(relative));
    }

    private Long resolvePublicId(Integer userId) {
        User author = userReposity.findById(userId).orElseThrow(() -> new ApiException(404, "用户不存在"));
        author = authService.assignPublicIdIfMissing(author);
        Long publicId = author.getPublicId();
        if (publicId == null) {
            throw new ApiException(500, "用户对外 ID 未就绪");
        }
        return publicId;
    }

    private Path ensureUploadRoot() {
        Path root = Paths.get(uploadRoot).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            log.error("无法创建上传目录 {}", root, e);
            throw new ApiException(500, "无法创建上传目录");
        }
        return root;
    }

    private static String expandMarkdownAssetPaths(String markdown) {
        if (markdown == null || markdown.isBlank()) {
            return "";
        }
        Matcher m = MARKDOWN_USERS_IMG.matcher(markdown);
        StringBuffer sb = new StringBuffer();
        while (m.find()) {
            String replacement = "![" + m.group(1) + "](/files/" + m.group(2) + ")";
            m.appendReplacement(sb, Matcher.quoteReplacement(replacement));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private String toPublicUrl(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            return "";
        }
        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        return base + "/files/" + relativePath.replace('\\', '/');
    }

    private BlogPostListItemResponse toListItem(BlogPost post, User author) {
        Instant displayInstant =
                post.getPublishedAt() != null ? post.getPublishedAt() : post.getUpdatedAt();
        return new BlogPostListItemResponse(
                post.getBlogId(),
                post.getCategory(),
                post.getTitle(),
                post.getExcerpt() != null ? post.getExcerpt() : "",
                author.getUserName(),
                author.getPublicId(),
                displayInstant != null ? CARD_DATE.format(displayInstant) : "",
                formatCompactCount(resolveDisplayViewCount(post)),
                post.getCommentCount(),
                toPublicUrl(post.getCoverPath()),
                parseTagsList(post.getTags()),
                statusToString(post.getStatus()),
                post.getCoverName(),
                post.getCoverByteSize(),
                post.getCoverMime(),
                post.getUpdatedAt());
    }

    private BlogPostResponse toDetail(BlogPost post, User author) {
        Instant displayInstant =
                post.getPublishedAt() != null ? post.getPublishedAt() : post.getUpdatedAt();
        return new BlogPostResponse(
                post.getBlogId(),
                post.getCategory(),
                post.getTitle(),
                post.getExcerpt() != null ? post.getExcerpt() : "",
                expandMarkdownAssetPaths(post.getBodyMarkdown()),
                author.getUserName(),
                displayInstant != null ? CARD_DATE.format(displayInstant) : "",
                formatCompactCount(resolveDisplayViewCount(post)),
                post.getCommentCount(),
                toPublicUrl(post.getCoverPath()),
                parseTagsList(post.getTags()),
                statusToString(post.getStatus()),
                post.getReviewNote(),
                post.getCoverName(),
                post.getCoverByteSize(),
                post.getCoverMime(),
                post.getCreatedAt(),
                post.getUpdatedAt(),
                post.getPublishedAt());
    }

    private static String statusToString(int status) {
        return switch (status) {
            case STATUS_PENDING -> "pending";
            case STATUS_PUBLISHED -> "published";
            case STATUS_REJECTED -> "rejected";
            default -> "draft";
        };
    }

    private static int parseStatus(String raw) {
        String s = raw != null ? raw.trim().toLowerCase(Locale.ROOT) : "draft";
        if (!ALLOWED_STATUS.contains(s)) {
            throw new ApiException(400, "无效的状态");
        }
        return switch (s) {
            case "pending" -> STATUS_PENDING;
            case "published" -> STATUS_PUBLISHED;
            default -> STATUS_DRAFT;
        };
    }

    private static String normalizeCategory(String category) {
        String c = category != null ? category.trim() : "";
        if (!ALLOWED_CATEGORY.contains(c)) {
            return "技术分享";
        }
        return c;
    }

    private static String normalizeTags(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String joined =
                Arrays.stream(raw.split("[,，]"))
                        .map(String::trim)
                        .filter(t -> !t.isEmpty())
                        .limit(12)
                        .collect(Collectors.joining(","));
        if (joined.isEmpty()) {
            return null;
        }
        return joined.length() > 512 ? joined.substring(0, 512) : joined;
    }

    private static List<String> parseTagsList(String tags) {
        if (tags == null || tags.isBlank()) {
            return List.of();
        }
        return Arrays.stream(tags.split(",")).map(String::trim).filter(t -> !t.isEmpty()).collect(Collectors.toList());
    }

    private static String trimMax(String value, int max, String emptyMsg, String longMsg) {
        String s = value != null ? value.trim() : "";
        if (s.isEmpty()) {
            throw new ApiException(400, emptyMsg);
        }
        if (s.length() > max) {
            throw new ApiException(400, longMsg);
        }
        return s;
    }

    private static String trimMaxNullable(String value, int max, String longMsg) {
        if (value == null) {
            return null;
        }
        String s = value.trim();
        if (s.isEmpty()) {
            return null;
        }
        if (s.length() > max) {
            throw new ApiException(400, longMsg);
        }
        return s;
    }

    private static String formatCompactCount(int value) {
        if (value >= 1000) {
            double compact = value / 1000.0;
            return (compact >= 10 ? String.format(Locale.ROOT, "%.0f", compact) : String.format(Locale.ROOT, "%.1f", compact))
                    + "k";
        }
        return String.valueOf(value);
    }
}
