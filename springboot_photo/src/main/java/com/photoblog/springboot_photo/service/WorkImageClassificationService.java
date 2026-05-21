package com.photoblog.springboot_photo.service;

import ai.djl.Application;
import ai.djl.inference.Predictor;
import ai.djl.modality.Classifications;
import ai.djl.modality.Classifications.Classification;
import ai.djl.modality.cv.Image;
import ai.djl.modality.cv.ImageFactory;
import ai.djl.modality.cv.translator.ImageClassificationTranslator;
import ai.djl.repository.zoo.Criteria;
import ai.djl.repository.zoo.ZooModel;
import com.photoblog.springboot_photo.config.CvProperties;
import com.photoblog.springboot_photo.repostity.WorkRepository;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;

/**
 * 使用 DJL 对作品图片做 ImageNet 风格分类，并写回 {@code tb_work}。
 * 模型：默认 PyTorch+ResNet18（Zoo 自动下载）；可选 OnnxRuntime + {@code app.cv.onnx-model-url}。
 */
@Service
@ConditionalOnProperty(prefix = "app.cv", name = "enabled", havingValue = "true")
public class WorkImageClassificationService {

    private static final Logger log = LoggerFactory.getLogger(WorkImageClassificationService.class);

    private static final int AI_LABEL_MAX_LEN = 255;

    private final CvProperties cvProperties;
    private final WorkRepository workRepository;
    private final ImagenetCoarseLabelMapper coarseLabelMapper;
    private final ObjectProvider<WorksFeedRedisCache> worksFeedRedisCacheProvider;

    private final Object modelLock = new Object();
    private volatile ZooModel<Image, Classifications> cachedModel;
    private volatile boolean modelLoadFailed;

    public WorkImageClassificationService(
            CvProperties cvProperties,
            WorkRepository workRepository,
            ImagenetCoarseLabelMapper coarseLabelMapper,
            ObjectProvider<WorksFeedRedisCache> worksFeedRedisCacheProvider) {
        this.cvProperties = cvProperties;
        this.workRepository = workRepository;
        this.coarseLabelMapper = coarseLabelMapper;
        this.worksFeedRedisCacheProvider = worksFeedRedisCacheProvider;
    }

    public boolean isCvGloballyEnabled() {
        return cvProperties.isEnabled();
    }

    /** 启动预热或健康检查：加载模型一次，成功返回 true。 */
    public boolean warmupModel() {
        if (!cvProperties.isEnabled()) {
            return false;
        }
        return ensureModel() != null;
    }

    public boolean isModelReady() {
        return cachedModel != null;
    }

    public boolean isModelLoadFailed() {
        return modelLoadFailed;
    }

    /**
     * 对磁盘上的图片推理并更新指定作品行；失败时仅打日志，不向外抛。
     * 写库事务见 {@link com.photoblog.springboot_photo.repostity.WorkRepository#updateAiPrediction}。
     */
    public void classifyAndPersist(Long workId, Path imageFile) {
        if (!cvProperties.isEnabled() || workId == null || imageFile == null) {
            return;
        }
        if (modelLoadFailed) {
            log.error(
                    "cv skip workId={}: 模型此前加载失败。JDK 24+ 请在 VM options 增加 --enable-native-access=ALL-UNNAMED 后重启；"
                            + "或查看启动日志中的 cv model load failed 完整异常栈",
                    workId);
            return;
        }
        try {
            if (!Files.isRegularFile(imageFile)) {
                log.warn("cv skip: file missing or not regular workId={} path={}", workId, imageFile);
                return;
            }
            long bytes = Files.size(imageFile);
            if (bytes == 0L) {
                log.warn("cv skip: empty file workId={} path={}", workId, imageFile);
                return;
            }
            log.debug("cv start workId={} path={} size={}", workId, imageFile, bytes);

            ZooModel<Image, Classifications> model = ensureModel();
            if (model == null) {
                return;
            }
            Image img = ImageFactory.getInstance().fromFile(imageFile);
            Classifications out;
            try (Predictor<Image, Classifications> predictor = model.newPredictor()) {
                out = predictor.predict(img);
            }
            Classification best = out.best();
            if (best == null) {
                log.warn("cv skip: empty classification workId={} path={}", workId, imageFile);
                return;
            }
            String labelRaw = best.getClassName();
            String label = truncate(labelRaw != null ? labelRaw : "", AI_LABEL_MAX_LEN);
            double score = finiteProb(best.getProbability());
            String topJson = topKJson(out.topK(5));
            ImagenetCoarseLabelMapper.CoarseLabelResult coarse = coarseLabelMapper.map(out);
            String feedCategory = ImagenetCoarseLabelMapper.coarseZhToWorkCategory(coarse.zhLabel());
            int updated =
                    workRepository.updateAiPrediction(
                            workId,
                            label,
                            score,
                            topJson,
                            coarse.zhLabel(),
                            coarse.winnerScore(),
                            coarse.featAnimal(),
                            coarse.featPortrait(),
                            coarse.featLandscape(),
                            coarse.featStreet(),
                            coarse.featStill(),
                            coarse.featOther(),
                            feedCategory);
            if (updated == 0) {
                log.warn(
                        "cv UPDATE affected 0 rows workId={} path={} (row missing or not visible in this transaction?)",
                        workId,
                        imageFile);
            } else {
                WorksFeedRedisCache cache = worksFeedRedisCacheProvider.getIfAvailable();
                if (cache != null) {
                    cache.bumpVersion();
                }
            }
            log.info(
                    "cv done workId={} label={} score={} coarse={}({}) category={} feats=[动{}人{}景{}街{}物{}他{}]",
                    workId,
                    label,
                    score,
                    coarse.zhLabel(),
                    coarse.winnerScore(),
                    feedCategory,
                    coarse.featAnimal(),
                    coarse.featPortrait(),
                    coarse.featLandscape(),
                    coarse.featStreet(),
                    coarse.featStill(),
                    coarse.featOther());
        } catch (Exception e) {
            log.error("cv classify failed workId={} path={} msg={}", workId, imageFile, e.getMessage(), e);
        }
    }

    private static String truncate(String s, int max) {
        if (s.length() <= max) {
            return s;
        }
        return s.substring(0, max);
    }

    private static double finiteProb(double p) {
        if (!Double.isFinite(p) || p < 0) {
            return 0.0;
        }
        return Math.min(1.0, p);
    }

    private ZooModel<Image, Classifications> ensureModel() {
        if (cachedModel != null) {
            return cachedModel;
        }
        synchronized (modelLock) {
            if (cachedModel != null) {
                return cachedModel;
            }
            if (modelLoadFailed) {
                return null;
            }
            boolean onnx = cvProperties.getOnnxModelUrl() != null && !cvProperties.getOnnxModelUrl().isBlank();
            log.info("cv loading model mode={} …", onnx ? "OnnxRuntime+custom-url" : "PyTorch+ResNet18-zoo");
            try {
                Criteria<Image, Classifications> criteria = buildCriteria();
                cachedModel = criteria.loadModel();
                return cachedModel;
            } catch (Exception e) {
                log.error(
                        "cv model load failed, further cv disabled. JDK 24+ 请添加 JVM 参数："
                                + " --enable-native-access=ALL-UNNAMED （IDEA：Run Configuration → VM options）",
                        e);
                modelLoadFailed = true;
                return null;
            }
        }
    }

    private Criteria<Image, Classifications> buildCriteria() {
        String onnxUrl = cvProperties.getOnnxModelUrl();
        if (onnxUrl != null && !onnxUrl.isBlank()) {
            String synset = cvProperties.getOnnxSynsetUrl();
            ImageClassificationTranslator translator =
                    ImageClassificationTranslator.builder()
                            .optSynsetUrl(synset != null && !synset.isBlank() ? synset.trim() : null)
                            .build();
            return Criteria.builder()
                    .setTypes(Image.class, Classifications.class)
                    .optModelUrls(onnxUrl.trim())
                    .optTranslator(translator)
                    .optEngine("OnnxRuntime")
                    .build();
        }
        return Criteria.builder()
                .optApplication(Application.CV.IMAGE_CLASSIFICATION)
                .setTypes(Image.class, Classifications.class)
                .optFilter("layers", "18")
                .optEngine("PyTorch")
                .build();
    }

    private static String topKJson(List<Classification> top) {
        StringBuilder sb = new StringBuilder();
        sb.append('[');
        for (int i = 0; i < top.size(); i++) {
            if (i > 0) {
                sb.append(',');
            }
            Classification c = top.get(i);
            double p = finiteProb(c.getProbability());
            sb.append("{\"class\":\"")
                    .append(escapeJson(c.getClassName()))
                    .append("\",\"probability\":")
                    .append(p)
                    .append('}');
        }
        sb.append(']');
        return sb.toString();
    }

    private static String escapeJson(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    @PreDestroy
    public void closeModel() {
        synchronized (modelLock) {
            if (cachedModel != null) {
                try {
                    cachedModel.close();
                } catch (Exception e) {
                    log.debug("cv model close: {}", e.toString());
                }
                cachedModel = null;
            }
        }
    }
}
