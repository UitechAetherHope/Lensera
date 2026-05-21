package com.photoblog.springboot_photo.config;

import com.photoblog.springboot_photo.service.WorkImageClassificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.concurrent.Executor;

/**
 * 启动后在后台预加载 CV 模型，避免首次上传才暴露「模型加载失败」；
 * 失败时日志会提示 JDK 24+ 需 {@code --enable-native-access=ALL-UNNAMED}。
 */
@Component
@Order(100)
@ConditionalOnProperty(prefix = "app.cv", name = "enabled", havingValue = "true", matchIfMissing = true)
public class CvModelWarmupRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CvModelWarmupRunner.class);

    private final WorkImageClassificationService workImageClassificationService;
    private final Executor cvTaskExecutor;

    public CvModelWarmupRunner(
            WorkImageClassificationService workImageClassificationService,
            @Qualifier("cvTaskExecutor") Executor cvTaskExecutor) {
        this.workImageClassificationService = workImageClassificationService;
        this.cvTaskExecutor = cvTaskExecutor;
    }

    @Override
    public void run(ApplicationArguments args) {
        cvTaskExecutor.execute(() -> {
            log.info("cv warmup: 后台预加载图像分类模型（首次可能需联网下载 PyTorch 原生库，请耐心等待）…");
            if (workImageClassificationService.warmupModel()) {
                log.info("cv warmup: 模型就绪，作品 AI 分类可用");
            } else {
                log.error(
                        "cv warmup: 模型加载失败。若使用 JDK 24+，请在运行配置的 VM options 添加："
                                + " --enable-native-access=ALL-UNNAMED ，或使用项目根目录 run-dev.cmd 启动");
            }
        });
    }
}
