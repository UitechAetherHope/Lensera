package com.photoblog.springboot_photo.service;

import com.photoblog.springboot_photo.exception.ApiException;
import com.photoblog.springboot_photo.pojo.User;
import com.photoblog.springboot_photo.pojo.UserFollow;
import com.photoblog.springboot_photo.pojo.dto.UserMeResponse;
import com.photoblog.springboot_photo.pojo.dto.UserPublicProfileDto;
import com.photoblog.springboot_photo.repostity.UserFollowRepository;
import com.photoblog.springboot_photo.repostity.UserReposity;
import com.photoblog.springboot_photo.repostity.WorkRepository;
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
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class UserProfileService {

    private static final Logger log = LoggerFactory.getLogger(UserProfileService.class);
    private static final Set<String> ALLOWED_IMAGE = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif");
    private static final long MAX_PROFILE_IMAGE_BYTES = 8 * 1024 * 1024;

    private final UserReposity userReposity;
    private final UserFollowRepository userFollowRepository;
    private final WorkRepository workRepository;
    private final AuthService authService;

    @Value("${app.upload.root:./data/upload-root}")
    private String uploadRoot;

    @Value("${app.public-base-url:http://localhost:8080}")
    private String publicBaseUrl;

    public UserProfileService(
            UserReposity userReposity,
            UserFollowRepository userFollowRepository,
            WorkRepository workRepository,
            AuthService authService) {
        this.userReposity = userReposity;
        this.userFollowRepository = userFollowRepository;
        this.workRepository = workRepository;
        this.authService = authService;
    }

    public String filePublicUrl(String relative) {
        if (relative == null || relative.isBlank()) {
            return null;
        }
        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        String path = relative.replace('\\', '/');
        return base + "/files/" + path;
    }

    public UserMeResponse buildMeResponse(User user) {
        return new UserMeResponse(
                user.getPublicId(),
                user.getUserName(),
                user.getEmail(),
                filePublicUrl(user.getAvatarPath()),
                filePublicUrl(user.getCoverPath()),
                effectiveCoverFocusX(user),
                effectiveCoverFocusY(user),
                normalizeBio(user.getBio()));
    }

    private static String normalizeBio(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim();
    }

    private static double effectiveCoverFocusX(User user) {
        return clampFocus(user.getCoverFocusX(), 50.0);
    }

    private static double effectiveCoverFocusY(User user) {
        return clampFocus(user.getCoverFocusY(), 42.0);
    }

    private static double clampFocus(Double value, double fallback) {
        if (value == null || !Double.isFinite(value)) {
            return fallback;
        }
        return Math.min(100.0, Math.max(0.0, Math.round(value * 10.0) / 10.0));
    }

    public UserPublicProfileDto getPublicProfile(Long publicId, Optional<Integer> viewerUserId) {
        User user = userReposity.findByPublicId(publicId)
                .orElseThrow(() -> new ApiException(404, "用户不存在"));
        Integer uid = user.getUserId();
        long followers = userFollowRepository.countByFolloweeId(uid);
        long following = userFollowRepository.countByFollowerId(uid);
        boolean followed = viewerUserId
                .map(v -> userFollowRepository.existsByFollowerIdAndFolloweeId(v, uid))
                .orElse(false);
        long likesReceived = workRepository.sumLikeCountPublishedByUserId(uid);
        return new UserPublicProfileDto(
                user.getPublicId(),
                user.getUserName(),
                likesReceived,
                following,
                followers,
                followed,
                filePublicUrl(user.getAvatarPath()),
                filePublicUrl(user.getCoverPath()),
                effectiveCoverFocusX(user),
                effectiveCoverFocusY(user),
                normalizeBio(user.getBio()));
    }

    @Transactional
    public UserPublicProfileDto follow(Long publicId, Integer followerUserId) {
        User followee = userReposity.findByPublicId(publicId)
                .orElseThrow(() -> new ApiException(404, "用户不存在"));
        if (followee.getUserId().equals(followerUserId)) {
            throw new ApiException(400, "不能关注自己");
        }
        if (userFollowRepository.existsByFollowerIdAndFolloweeId(followerUserId, followee.getUserId())) {
            throw new ApiException(409, "已关注");
        }
        UserFollow row = new UserFollow();
        row.setFollowerId(followerUserId);
        row.setFolloweeId(followee.getUserId());
        userFollowRepository.save(row);
        return getPublicProfile(publicId, Optional.of(followerUserId));
    }

    @Transactional
    public UserPublicProfileDto unfollow(Long publicId, Integer followerUserId) {
        User followee = userReposity.findByPublicId(publicId)
                .orElseThrow(() -> new ApiException(404, "用户不存在"));
        userFollowRepository.deleteByFollowerIdAndFolloweeId(followerUserId, followee.getUserId());
        return getPublicProfile(publicId, Optional.of(followerUserId));
    }

    /**
     * 更新当前用户昵称与/或头像、主页背景图；文件写入 users/{publicId}/avatar、background。
     */
    @Transactional
    public UserMeResponse updateMyProfile(
            Integer userId,
            String userNameParam,
            MultipartFile avatar,
            MultipartFile cover,
            Double coverFocusXParam,
            Double coverFocusYParam,
            String bioParam)
            throws IOException {
        User user = userReposity.findById(userId).orElseThrow(() -> new ApiException(404, "用户不存在"));
        user = authService.assignPublicIdIfMissing(user);
        Long publicId = user.getPublicId();
        if (publicId == null) {
            throw new ApiException(500, "用户对外 ID 未就绪");
        }

        boolean hasAvatar = avatar != null && !avatar.isEmpty();
        boolean hasCover = cover != null && !cover.isEmpty();
        String nameTrim = userNameParam != null ? userNameParam.trim() : "";

        boolean nameChange = !nameTrim.isEmpty() && !nameTrim.equals(user.getUserName());
        boolean focusChange = focusParamChanged(user.getCoverFocusX(), coverFocusXParam)
                || focusParamChanged(user.getCoverFocusY(), coverFocusYParam);
        boolean bioChange = bioParam != null
                && !normalizeBio(bioParam).equals(normalizeBio(user.getBio()));
        if (!nameChange && !hasAvatar && !hasCover && !focusChange && !bioChange) {
            throw new ApiException(400, "请至少修改昵称、头像、背景图、显示区域或个人签名之一");
        }

        if (nameChange) {
            if (nameTrim.length() > 64) {
                throw new ApiException(400, "昵称过长");
            }
            userReposity.findByUserName(nameTrim).ifPresent(other -> {
                if (!other.getUserId().equals(userId)) {
                    throw new ApiException(409, "该昵称已被使用");
                }
            });
            user.setUserName(nameTrim);
        }

        Path root = Paths.get(uploadRoot).toAbsolutePath().normalize();
        Files.createDirectories(root);

        if (hasAvatar) {
            String rel = saveProfileImage(root, publicId, avatar, true);
            tryDeleteUnderRoot(root, user.getAvatarPath());
            user.setAvatarPath(rel);
        }
        if (hasCover) {
            String rel = saveProfileImage(root, publicId, cover, false);
            tryDeleteUnderRoot(root, user.getCoverPath());
            user.setCoverPath(rel);
        }
        if (coverFocusXParam != null) {
            user.setCoverFocusX(clampFocus(coverFocusXParam, effectiveCoverFocusX(user)));
        }
        if (coverFocusYParam != null) {
            user.setCoverFocusY(clampFocus(coverFocusYParam, effectiveCoverFocusY(user)));
        }
        if (bioChange) {
            String bioTrim = normalizeBio(bioParam);
            if (bioTrim.length() > 200) {
                throw new ApiException(400, "个人签名不能超过 200 字");
            }
            user.setBio(bioTrim.isEmpty() ? null : bioTrim);
        }

        userReposity.save(user);
        log.info("profile updated userId={} nameChange={} avatar={} cover={}", userId, nameChange, hasAvatar, hasCover);
        return buildMeResponse(user);
    }

    private String saveProfileImage(Path root, long publicId, MultipartFile file, boolean avatar) throws IOException {
        if (file.getSize() > MAX_PROFILE_IMAGE_BYTES) {
            throw new ApiException(400, "图片不能超过 8MB");
        }
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase(Locale.ROOT) : "";
        if (!ALLOWED_IMAGE.contains(contentType)) {
            throw new ApiException(400, "仅支持 jpg / png / webp / gif");
        }
        String dir = avatar ? UserUploadPaths.avatarDirectory(publicId) : UserUploadPaths.homeBackgroundDirectory(publicId);
        String baseName = Instant.now().toEpochMilli() + "_" + UUID.randomUUID().toString().replace("-", "");
        String relative = dir + "/" + baseName;
        relative = relative.replace('\\', '/');

        Path targetDir = root.resolve(dir).normalize();
        if (!targetDir.startsWith(root)) {
            throw new ApiException(400, "非法路径");
        }
        Files.createDirectories(targetDir);

        byte[] bytes = file.getBytes();
        String savedFileName = avatar
                ? ProfileImageCompressor.saveAvatar(bytes, contentType, targetDir, baseName)
                : ProfileImageCompressor.saveCover(bytes, contentType, targetDir, baseName);
        return (dir + "/" + savedFileName).replace('\\', '/');
    }

    private static boolean focusParamChanged(Double stored, Double incoming) {
        if (incoming == null || !Double.isFinite(incoming)) {
            return false;
        }
        double old = stored != null && Double.isFinite(stored) ? stored : 42.0;
        return Math.abs(old - clampFocus(incoming, old)) > 0.05;
    }

    private void tryDeleteUnderRoot(Path root, String relative) {
        if (relative == null || relative.isBlank() || relative.contains("..")) {
            return;
        }
        try {
            Path p = root.resolve(relative.replace('\\', '/')).normalize();
            if (p.startsWith(root)) {
                Files.deleteIfExists(p);
            }
        } catch (IOException e) {
            log.warn("删除旧资料文件失败 rel={}", relative, e);
        }
    }

}
