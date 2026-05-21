package com.photoblog.springboot_photo.service;

import com.photoblog.springboot_photo.exception.ApiException;
import com.photoblog.springboot_photo.pojo.User;
import com.photoblog.springboot_photo.pojo.Work;
import com.photoblog.springboot_photo.pojo.WorkLike;
import com.photoblog.springboot_photo.pojo.dto.WorkFeedCardResponse;
import com.photoblog.springboot_photo.pojo.dto.WorkListItemResponse;
import com.photoblog.springboot_photo.pojo.dto.WorkResponse;
import com.photoblog.springboot_photo.repostity.UserReposity;
import com.photoblog.springboot_photo.repostity.WorkLikeRepository;
import com.photoblog.springboot_photo.repostity.WorkRepository;
import com.photoblog.springboot_photo.util.UserUploadPaths;
import com.photoblog.springboot_photo.service.vision.WorkVisionCategoryService;
import com.photoblog.springboot_photo.util.WorkUploadImageCompressor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

@Service
public class WorkService {

    private static final Logger log = LoggerFactory.getLogger(WorkService.class);
    private static final Set<String> ALLOWED_CONTENT = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif");

    /** 上传与作品流筛选：手选五类；未选分类则 category 列为 null */
    private static final Set<String> ALLOWED_WORK_CATEGORY = Set.of("风景", "人物", "动物", "街拍", "静物");

    /** 列表接口 caption 截断长度，避免单条数万字 × N 条撑爆响应与前端解析 */
    private static final int CAPTION_LIST_PREVIEW_MAX = 800;
    private final WorkRepository workRepository;
    private final WorkLikeRepository workLikeRepository;
    private final UserReposity userReposity;
    private final AuthService authService;
    private final WorkVisionCategoryService workVisionCategoryService;
    private final Executor cvTaskExecutor;
    private final ObjectProvider<WorksFeedRedisCache> worksFeedRedisCacheProvider;

    @Value("${app.upload.root:./data/upload-root}")
    private String uploadRoot;

    @Value("${app.public-base-url:http://localhost:8080}")
    private String publicBaseUrl;

    public WorkService(
            WorkRepository workRepository,
            WorkLikeRepository workLikeRepository,
            UserReposity userReposity,
            AuthService authService,
            WorkVisionCategoryService workVisionCategoryService,
            @Qualifier("cvTaskExecutor") Executor cvTaskExecutor,
            ObjectProvider<WorksFeedRedisCache> worksFeedRedisCacheProvider) {
        this.workRepository = workRepository;
        this.workLikeRepository = workLikeRepository;
        this.userReposity = userReposity;
        this.authService = authService;
        this.workVisionCategoryService = workVisionCategoryService;
        this.cvTaskExecutor = cvTaskExecutor;
        this.worksFeedRedisCacheProvider = worksFeedRedisCacheProvider;
    }

    public long sumPublishedLikeCountByUserId(Integer userId) {
        return workRepository.sumLikeCountPublishedByUserId(userId);
    }

    @Transactional
    public WorkResponse createWork(
            Integer userId, String title, String caption, String category, boolean aiClassify, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(400, "请选择图片文件");
        }
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase(Locale.ROOT) : "";
        if (!ALLOWED_CONTENT.contains(contentType)) {
            throw new ApiException(400, "仅支持 jpg / png / webp / gif");
        }
        String safeTitle = title != null ? title.trim() : "";
        if (safeTitle.isEmpty()) {
            throw new ApiException(400, "标题不能为空");
        }
        if (safeTitle.length() > 128) {
            throw new ApiException(400, "标题过长");
        }
        String cap = caption != null ? caption.trim() : "";
        if (cap.length() > 20000) {
            throw new ApiException(400, "文案过长");
        }
        String cat = resolveCategoryForSave(category, aiClassify);

        User author = userReposity.findById(userId).orElseThrow(() -> new ApiException(404, "用户不存在"));
        author = authService.assignPublicIdIfMissing(author);
        Long publicId = author.getPublicId();
        if (publicId == null) {
            throw new ApiException(500, "用户对外 ID 未就绪，请稍后重试");
        }

        Path root = Paths.get(uploadRoot).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            log.error("无法创建上传目录 {}", root, e);
            throw new ApiException(500, "无法创建上传目录，请检查 app.upload.root 配置");
        }

        // 作品仅存 users/{publicId}/works/...；头像与主页背景见 UserUploadPaths 预留目录
        String subDir = UserUploadPaths.worksMonthDirectory(publicId, Instant.now());
        String baseName = UUID.randomUUID().toString().replace("-", "");
        Path monthDir = root.resolve(subDir).normalize();
        String relative;
        Path dest;
        try {
            Files.createDirectories(monthDir);
            byte[] bytes = file.getBytes();
            if (bytes.length > 45 * 1024 * 1024) {
                throw new ApiException(400, "图片过大（超过 45MB）");
            }
            WorkUploadImageCompressor.SavedWorkImage savedImg =
                    WorkUploadImageCompressor.compressAndSaveWithThumb(bytes, contentType, monthDir, baseName);
            String savedName = savedImg.mainFileName();
            relative = subDir.replace('\\', '/') + "/" + savedName;
            dest = monthDir.resolve(savedName).normalize();
            if (!dest.startsWith(root)) {
                throw new ApiException(500, "非法保存路径");
            }
        } catch (ApiException e) {
            throw e;
        } catch (IOException e) {
            log.error("保存或压缩作品图失败 dir={}", monthDir, e);
            throw new ApiException(500, "保存文件失败");
        }

        Work w = new Work();
        w.setUserId(userId);
        w.setTitle(safeTitle);
        w.setCaption(cap.isEmpty() ? null : cap);
        w.setImagePath(relative);
        w.setCategory(cat);
        w.setLikeCount(0);
        w.setStatus(1);
        Work saved = workRepository.save(w);
        log.info("work created workId={} userId={} path={}", saved.getWorkId(), userId, relative);
        scheduleFeedCacheBumpAfterCommit();
        if (aiClassify && workVisionCategoryService.isEnabled()) {
            scheduleVisionClassifyAfterCommit(
                    saved.getWorkId(), dest.toAbsolutePath().normalize(), safeTitle, cap);
        }
        return toResponse(saved, author, Optional.of(userId));
    }

    @Transactional
    public WorkResponse updateWork(
            Integer userId,
            Long workId,
            String title,
            String caption,
            String category,
            boolean aiClassify,
            MultipartFile file) {
        Work w = workRepository.findById(workId).orElseThrow(() -> new ApiException(404, "作品不存在"));
        if (!Objects.equals(w.getUserId(), userId)) {
            throw new ApiException(403, "无权修改该作品");
        }
        String safeTitle = title != null ? title.trim() : "";
        if (safeTitle.isEmpty()) {
            throw new ApiException(400, "标题不能为空");
        }
        if (safeTitle.length() > 128) {
            throw new ApiException(400, "标题过长");
        }
        String cap = caption != null ? caption.trim() : "";
        if (cap.length() > 20000) {
            throw new ApiException(400, "文案过长");
        }
        String cat = resolveCategoryForSave(category, aiClassify);

        User author = userReposity.findById(userId).orElseThrow(() -> new ApiException(404, "用户不存在"));
        author = authService.assignPublicIdIfMissing(author);
        Long publicId = author.getPublicId();
        if (publicId == null) {
            throw new ApiException(500, "用户对外 ID 未就绪，请稍后重试");
        }

        Path destAbs = null;
        if (file != null && !file.isEmpty()) {
            String contentType = file.getContentType() != null ? file.getContentType().toLowerCase(Locale.ROOT) : "";
            if (!ALLOWED_CONTENT.contains(contentType)) {
                throw new ApiException(400, "仅支持 jpg / png / webp / gif");
            }
            Path root = Paths.get(uploadRoot).toAbsolutePath().normalize();
            try {
                Files.createDirectories(root);
            } catch (IOException e) {
                log.error("无法创建上传目录 {}", root, e);
                throw new ApiException(500, "无法创建上传目录，请检查 app.upload.root 配置");
            }
            String subDir = UserUploadPaths.worksMonthDirectory(publicId, Instant.now());
            String baseName = UUID.randomUUID().toString().replace("-", "");
            Path monthDir = root.resolve(subDir).normalize();
            String relative;
            Path dest;
            try {
                Files.createDirectories(monthDir);
                byte[] bytes = file.getBytes();
                if (bytes.length > 45 * 1024 * 1024) {
                    throw new ApiException(400, "图片过大（超过 45MB）");
                }
                WorkUploadImageCompressor.SavedWorkImage savedImg =
                        WorkUploadImageCompressor.compressAndSaveWithThumb(bytes, contentType, monthDir, baseName);
                String savedName = savedImg.mainFileName();
                relative = subDir.replace('\\', '/') + "/" + savedName;
                dest = monthDir.resolve(savedName).normalize();
                if (!dest.startsWith(root)) {
                    throw new ApiException(500, "非法保存路径");
                }
            } catch (ApiException e) {
                throw e;
            } catch (IOException e) {
                log.error("保存或压缩作品图失败 dir={}", monthDir, e);
                throw new ApiException(500, "保存文件失败");
            }
            deleteWorkImageFiles(w.getImagePath());
            w.setImagePath(relative);
            destAbs = dest.toAbsolutePath().normalize();
            log.info("work image replaced workId={} path={}", workId, relative);
        }

        w.setTitle(safeTitle);
        w.setCaption(cap.isEmpty() ? null : cap);
        w.setCategory(cat);
        Work saved = workRepository.save(w);
        scheduleFeedCacheBumpAfterCommit();

        if (aiClassify && workVisionCategoryService.isEnabled()) {
            Path classifyAbs = destAbs;
            if (classifyAbs == null) {
                String rel = saved.getImagePath() != null ? saved.getImagePath().replace('\\', '/') : "";
                if (!rel.isEmpty() && !rel.contains("..")) {
                    Path root = Paths.get(uploadRoot).toAbsolutePath().normalize();
                    Path abs = root.resolve(rel).normalize();
                    if (abs.startsWith(root) && Files.isRegularFile(abs)) {
                        classifyAbs = abs;
                    }
                }
            }
            if (classifyAbs != null) {
                scheduleVisionClassifyAfterCommit(saved.getWorkId(), classifyAbs, safeTitle, cap);
            }
        }

        log.info("work updated workId={} userId={}", workId, userId);
        return toResponse(saved, author, Optional.of(userId));
    }

    public List<WorkListItemResponse> listPublishedByPublicId(Long publicId, Optional<Integer> viewerUserId) {
        User user = userReposity.findByPublicId(publicId)
                .orElseThrow(() -> new ApiException(404, "用户不存在"));
        final User author = authService.assignPublicIdIfMissing(user);
        List<Work> list = workRepository.findByUserIdAndStatusOrderByCreatedAtDesc(author.getUserId(), 1);
        List<Long> workIds = list.stream().map(Work::getWorkId).collect(Collectors.toList());
        Set<Long> likedByViewer = viewerUserId.map(uid -> batchLikedWorkIds(uid, workIds)).orElse(null);
        return list.stream()
                .map(w ->
                        buildListItemResponse(
                                w,
                                author,
                                likedByViewer == null ? null : likedByViewer.contains(w.getWorkId())))
                .collect(Collectors.toList());
    }

    public List<WorkListItemResponse> listMine(Integer userId) {
        User user = userReposity.findById(userId).orElseThrow(() -> new ApiException(404, "用户不存在"));
        final User author = authService.assignPublicIdIfMissing(user);
        List<Work> list = workRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<Long> workIds = list.stream().map(Work::getWorkId).collect(Collectors.toList());
        Set<Long> likedMine = batchLikedWorkIds(userId, workIds);
        return list.stream()
                .map(w -> buildListItemResponse(w, author, likedMine.contains(w.getWorkId())))
                .collect(Collectors.toList());
    }

    /**
     * 全站作品流：先查作品行，再批量作者、批量点赞，最后组装 DTO；命中 Redis 时跳过重复拼装。
     */
    public List<WorkFeedCardResponse> listPublishedFeed(String category, Optional<Integer> viewerUserId) {
        WorksFeedRedisCache cache = worksFeedRedisCacheProvider.getIfAvailable();
        if (cache != null) {
            return cache.getOrCompute(category, viewerUserId, () -> assemblePublishedFeedFromDb(category, viewerUserId));
        }
        return assemblePublishedFeedFromDb(category, viewerUserId);
    }

    private List<WorkFeedCardResponse> assemblePublishedFeedFromDb(String category, Optional<Integer> viewerUserId) {
        List<Work> works = loadPublishedWorksForFeed(category);
        if (works.isEmpty()) {
            return List.of();
        }
        Map<Integer, User> authorById = batchLoadAuthorsForUserIds(works);
        Set<Long> likedByViewer = resolveViewerLikedSet(viewerUserId, works);
        return works.stream()
                .map(w -> {
                    User author = authorById.get(w.getUserId());
                    if (author == null) {
                        return null;
                    }
                    Boolean liked = likedByViewer == null ? null : likedByViewer.contains(w.getWorkId());
                    return buildFeedCard(w, author, liked);
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    /**
     * AI 开启时：禁止手选分类，入库 category 置空，待云端视觉 API 异步写入；
     * 未开启 AI 时：仅接受白名单手选分类。
     */
    private String resolveCategoryForSave(String category, boolean aiClassify) {
        String catRaw = category != null ? category.trim() : "";
        if (aiClassify) {
            if (!catRaw.isEmpty()) {
                throw new ApiException(400, "已开启 AI 自动分类，请勿手选分类标签");
            }
            if (!workVisionCategoryService.isEnabled()) {
                throw new ApiException(
                        400,
                        "AI 自动分类未配置：请在 springboot_photo/src/main/resources/application-local.properties "
                                + "添加一行 app.vision.providers.doubao.api-key=你的密钥（或设置环境变量 DOUBAO_API_KEY），保存后重启后端");
            }
            return null;
        }
        if (catRaw.isEmpty()) {
            return null;
        }
        if (!ALLOWED_WORK_CATEGORY.contains(catRaw)) {
            return null;
        }
        return catRaw.substring(0, Math.min(32, catRaw.length()));
    }

    /**
     * 事务提交后再调视觉 API，避免异步线程读不到未提交的作品行。
     */
    private void scheduleVisionClassifyAfterCommit(Long workId, Path imageFile, String title, String caption) {
        Runnable job = () -> workVisionCategoryService.classifyAndPersist(workId, imageFile, title, caption);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            runVisionJob(job);
                        }
                    });
        } else {
            runVisionJob(job);
        }
    }

    private void runVisionJob(Runnable job) {
        if (workVisionCategoryService.isAsync()) {
            cvTaskExecutor.execute(job);
        } else {
            job.run();
        }
    }

    private void scheduleFeedCacheBumpAfterCommit() {
        WorksFeedRedisCache cache = worksFeedRedisCacheProvider.getIfAvailable();
        if (cache == null) {
            return;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            WorksFeedRedisCache c = worksFeedRedisCacheProvider.getIfAvailable();
                            if (c != null) {
                                c.bumpVersion();
                            }
                        }
                    });
        } else {
            cache.bumpVersion();
        }
    }

    private List<Work> loadPublishedWorksForFeed(String category) {
        if (category == null || category.isBlank()) {
            return workRepository.findByStatusOrderByCreatedAtDesc(1);
        }
        String c = category.trim();
        if (!ALLOWED_WORK_CATEGORY.contains(c)) {
            throw new ApiException(400, "无效的分类参数");
        }
        return workRepository.findByStatusAndCategoryOrderByCreatedAtDesc(1, c);
    }

    private Map<Integer, User> batchLoadAuthorsForUserIds(List<Work> works) {
        Set<Integer> authorIds = works.stream().map(Work::getUserId).collect(Collectors.toSet());
        return userReposity.findByUserIdIn(authorIds).stream()
                .map(authService::assignPublicIdIfMissing)
                .collect(Collectors.toMap(User::getUserId, u -> u, (a, b) -> a));
    }

    /** null 表示未登录，不展示「是否已赞」 */
    private Set<Long> resolveViewerLikedSet(Optional<Integer> viewerUserId, List<Work> works) {
        List<Long> workIds = works.stream().map(Work::getWorkId).collect(Collectors.toList());
        return viewerUserId.map(uid -> batchLikedWorkIds(uid, workIds)).orElse(null);
    }

    private WorkFeedCardResponse buildFeedCard(Work w, User author, Boolean likedByMe) {
        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        String path = w.getImagePath().replace('\\', '/');
        String imageUrl = base + "/files/" + path;
        String thumbUrl = publicThumbUrlIfExists(path);
        String authorAvatarUrl = buildPublicFileUrl(base, author.getAvatarPath());
        String cap = w.getCaption() != null ? truncateListCaption(w.getCaption()) : "";
        long createdMs = w.getCreatedAt() != null ? w.getCreatedAt().toEpochMilli() : 0L;
        return new WorkFeedCardResponse(
                w.getWorkId(),
                author.getPublicId(),
                author.getUserName(),
                authorAvatarUrl,
                w.getTitle(),
                cap,
                w.getCategory(),
                imageUrl,
                thumbUrl,
                w.getLikeCount(),
                likedByMe,
                createdMs);
    }

    public WorkResponse getWork(Long workId, Optional<Integer> viewerUserId) {
        Work w = workRepository.findById(workId).orElseThrow(() -> new ApiException(404, "作品不存在"));
        if (w.getStatus() != 1) {
            boolean owner = viewerUserId.map(id -> id.equals(w.getUserId())).orElse(false);
            if (!owner) {
                throw new ApiException(404, "作品不存在");
            }
        }
        User author = userReposity.findById(w.getUserId()).orElseThrow(() -> new ApiException(404, "作者不存在"));
        return toResponse(w, authService.assignPublicIdIfMissing(author), viewerUserId);
    }

    /**
     * 作者对已有作品重跑 AI 分类（磁盘文件须仍在）。异步时立即返回当前行数据，AI 列需稍后刷新再看。
     */
    public WorkResponse requestAiReclassify(Integer userId, Long workId) {
        Work w = workRepository.findById(workId).orElseThrow(() -> new ApiException(404, "作品不存在"));
        if (!Objects.equals(w.getUserId(), userId)) {
            throw new ApiException(403, "仅作者可触发重分类");
        }
        if (!workVisionCategoryService.isEnabled()) {
            throw new ApiException(400, "云端视觉分类未配置 API Key");
        }
        String rel = w.getImagePath() != null ? w.getImagePath().replace('\\', '/') : "";
        if (rel.isEmpty() || rel.contains("..")) {
            throw new ApiException(400, "无效图片路径");
        }
        Path root = Paths.get(uploadRoot).toAbsolutePath().normalize();
        Path abs = root.resolve(rel).normalize();
        if (!abs.startsWith(root)) {
            throw new ApiException(400, "非法路径");
        }
        if (!Files.isRegularFile(abs)) {
            throw new ApiException(404, "图片文件不存在，无法重分类");
        }
        final Path absFinal = abs;
        scheduleVisionClassifyAfterCommit(
                workId, absFinal, w.getTitle() != null ? w.getTitle() : "", w.getCaption() != null ? w.getCaption() : "");
        User author = userReposity.findById(w.getUserId()).orElseThrow(() -> new ApiException(404, "作者不存在"));
        return toResponse(w, authService.assignPublicIdIfMissing(author), Optional.of(userId));
    }

    @Transactional
    public WorkResponse like(Long workId, Integer userId) {
        Work w = workRepository.findById(workId).orElseThrow(() -> new ApiException(404, "作品不存在"));
        if (w.getStatus() != 1) {
            throw new ApiException(400, "无法点赞未发布作品");
        }
        if (workLikeRepository.existsByWorkIdAndUserId(workId, userId)) {
            throw new ApiException(409, "已点赞");
        }
        WorkLike row = new WorkLike();
        row.setWorkId(workId);
        row.setUserId(userId);
        workLikeRepository.save(row);
        w.setLikeCount(w.getLikeCount() + 1);
        workRepository.save(w);
        User author = authService.assignPublicIdIfMissing(
                userReposity.findById(w.getUserId()).orElseThrow(() -> new ApiException(404, "作者不存在")));
        scheduleFeedCacheBumpAfterCommit();
        return toResponse(w, author, Optional.of(userId));
    }

    /**
     * 删除作品：仅作者本人；先清点赞，再删磁盘文件（路径须落在上传根下），最后删库。
     */
    @Transactional
    public void deleteWork(Integer userId, Long workId) {
        Work w = workRepository.findById(workId).orElseThrow(() -> new ApiException(404, "作品不存在"));
        if (!Objects.equals(w.getUserId(), userId)) {
            throw new ApiException(403, "无权删除该作品");
        }
        workLikeRepository.deleteByWorkId(workId);
        deleteWorkImageFiles(w.getImagePath());
        workRepository.delete(w);
        log.info("work deleted workId={} userId={}", workId, userId);
        scheduleFeedCacheBumpAfterCommit();
    }

    @Transactional
    public WorkResponse unlike(Long workId, Integer userId) {
        Work w = workRepository.findById(workId).orElseThrow(() -> new ApiException(404, "作品不存在"));
        if (!workLikeRepository.existsByWorkIdAndUserId(workId, userId)) {
            User author = authService.assignPublicIdIfMissing(
                    userReposity.findById(w.getUserId()).orElseThrow(() -> new ApiException(404, "作者不存在")));
            return toResponse(w, author, Optional.of(userId));
        }
        workLikeRepository.deleteByWorkIdAndUserId(workId, userId);
        w.setLikeCount(Math.max(0, w.getLikeCount() - 1));
        workRepository.save(w);
        User author = authService.assignPublicIdIfMissing(
                userReposity.findById(w.getUserId()).orElseThrow(() -> new ApiException(404, "作者不存在")));
        scheduleFeedCacheBumpAfterCommit();
        return toResponse(w, author, Optional.of(userId));
    }

    /** 单条路径：查一次当前用户是否点赞该作品 */
    private WorkResponse toResponse(Work w, User author, Optional<Integer> viewerUserId) {
        Boolean liked =
                viewerUserId.map(uid -> workLikeRepository.existsByWorkIdAndUserId(w.getWorkId(), uid)).orElse(null);
        return buildWorkResponse(w, author, liked);
    }

    /**
     * 列表路径应传入已算好的 likedByMe（null=未登录）；避免对每条作品再查库。
     */
    private WorkResponse buildWorkResponse(Work w, User author, Boolean likedByMe) {
        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        String path = w.getImagePath().replace('\\', '/');
        String url = base + "/files/" + path;
        String thumbUrl = publicThumbUrlIfExists(path);
        String authorAvatarUrl = buildPublicFileUrl(base, author.getAvatarPath());
        long epoch = w.getCreatedAt() != null ? w.getCreatedAt().toEpochMilli() : 0L;
        return new WorkResponse(
                w.getWorkId(),
                author.getPublicId(),
                author.getUserName(),
                authorAvatarUrl,
                w.getTitle(),
                w.getCaption() != null ? w.getCaption() : "",
                w.getCategory(),
                path,
                url,
                thumbUrl,
                w.getLikeCount(),
                likedByMe,
                epoch,
                w.getAiLabel(),
                w.getAiScore(),
                w.getAiTopKJson(),
                w.getAiCoarseZh(),
                w.getAiCoarseScore(),
                w.getAiFeatAnimal(),
                w.getAiFeatPortrait(),
                w.getAiFeatLandscape(),
                w.getAiFeatStreet(),
                w.getAiFeatStill(),
                w.getAiFeatOther());
    }

    private Set<Long> batchLikedWorkIds(Integer viewerUserId, List<Long> workIds) {
        if (workIds.isEmpty()) {
            return Set.of();
        }
        return new HashSet<>(workLikeRepository.findWorkIdsByUserIdAndWorkIdIn(viewerUserId, workIds));
    }

    private static String truncateListCaption(String caption) {
        if (caption == null || caption.isEmpty()) {
            return "";
        }
        if (caption.length() <= CAPTION_LIST_PREVIEW_MAX) {
            return caption;
        }
        return caption.substring(0, CAPTION_LIST_PREVIEW_MAX) + "\u2026";
    }

    private WorkListItemResponse buildListItemResponse(Work w, User author, Boolean likedByMe) {
        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        String path = w.getImagePath().replace('\\', '/');
        String url = base + "/files/" + path;
        String thumbUrl = publicThumbUrlIfExists(path);
        String authorAvatarUrl = buildPublicFileUrl(base, author.getAvatarPath());
        long epoch = w.getCreatedAt() != null ? w.getCreatedAt().toEpochMilli() : 0L;
        String cap = w.getCaption() != null ? truncateListCaption(w.getCaption()) : "";
        return new WorkListItemResponse(
                w.getWorkId(),
                author.getPublicId(),
                author.getUserName(),
                authorAvatarUrl,
                w.getTitle(),
                cap,
                w.getCategory(),
                path,
                url,
                thumbUrl,
                w.getLikeCount(),
                likedByMe,
                epoch);
    }

    /** 磁盘存在 {@code *_thumb.jpg} 时返回完整 URL，否则 null（旧数据或未生成缩略图） */
    private String publicThumbUrlIfExists(String mainImagePathRelative) {
        String thumbRel = WorkUploadImageCompressor.thumbRelativePathForMain(mainImagePathRelative);
        if (thumbRel == null) {
            return null;
        }
        Path root = Paths.get(uploadRoot).toAbsolutePath().normalize();
        Path thumbAbs = root.resolve(thumbRel.replace('\\', '/')).normalize();
        if (!thumbAbs.startsWith(root) || !Files.isRegularFile(thumbAbs)) {
            return null;
        }
        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        return base + "/files/" + thumbRel.replace('\\', '/');
    }

    /** 将上传根相对路径拼成对外可访问 URL；非法路径返回 null */
    private static String buildPublicFileUrl(String base, String relative) {
        if (relative == null) {
            return null;
        }
        String p = relative.trim().replace('\\', '/');
        if (p.isEmpty() || p.contains("..")) {
            return null;
        }
        return base + "/files/" + p;
    }

    private void deleteWorkImageFiles(String imagePath) {
        Path root = Paths.get(uploadRoot).toAbsolutePath().normalize();
        String rel = imagePath != null ? imagePath.replace('\\', '/') : "";
        if (rel.isEmpty() || rel.contains("..")) {
            return;
        }
        Path abs = root.resolve(rel).normalize();
        if (!abs.startsWith(root)) {
            log.warn("跳过异常路径 rel={}", rel);
            return;
        }
        try {
            Files.deleteIfExists(abs);
        } catch (IOException e) {
            log.warn("删除作品文件失败 path={}", abs, e);
        }
        String thumbRel = WorkUploadImageCompressor.thumbRelativePathForMain(rel);
        if (thumbRel != null) {
            Path thumbAbs = root.resolve(thumbRel.replace('\\', '/')).normalize();
            if (thumbAbs.startsWith(root)) {
                try {
                    Files.deleteIfExists(thumbAbs);
                } catch (IOException e) {
                    log.warn("删除作品缩略图失败 path={}", thumbAbs, e);
                }
            }
        }
    }

    private static String extensionFromContentType(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> ".bin";
        };
    }
}
