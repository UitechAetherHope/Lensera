package com.photoblog.springboot_photo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 作品上传后的自动图像分类（DJL）。
 * <ul>
 *   <li>{@code onnx-model-url} 为空：使用 PyTorch 引擎 + Zoo 中的 ResNet18(ImageNet)，首次运行从 mlrepo 自动下载。</li>
 *   <li>{@code onnx-model-url} 非空：使用 OnnxRuntime 加载该地址的模型（需与 synset 类别数一致，默认 ImageNet 千类）。</li>
 * </ul>
 */
@ConfigurationProperties(prefix = "app.cv")
public class CvProperties {

    /** 关闭后上传不再做推理 */
    private boolean enabled = true;

    /** 为 true 时在后台线程写库，接口立即返回；为 false 时同步推理（可能多等数秒） */
    private boolean async = true;

    /**
     * ONNX 模型 URL（http/https）或本地 file:/// 路径；留空则走 PyTorch+ResNet18。
     * 使用 ONNX 时需自行保证模型输入为常见 ImageNet 预处理（224、归一化等），否则需改 {@link com.photoblog.springboot_photo.service.WorkImageClassificationService}。
     */
    private String onnxModelUrl = "";

    /** 与 ONNX 输出维度一致的 synset 文本 URL，每行一个类名 */
    private String onnxSynsetUrl =
            "https://raw.githubusercontent.com/deepjavalibrary/djl/master/model-zoo/src/test/resources/mlrepo/model/cv/image_classification/ai/djl/zoo/synset_imagenet.txt";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isAsync() {
        return async;
    }

    public void setAsync(boolean async) {
        this.async = async;
    }

    public String getOnnxModelUrl() {
        return onnxModelUrl;
    }

    public void setOnnxModelUrl(String onnxModelUrl) {
        this.onnxModelUrl = onnxModelUrl;
    }

    public String getOnnxSynsetUrl() {
        return onnxSynsetUrl;
    }

    public void setOnnxSynsetUrl(String onnxSynsetUrl) {
        this.onnxSynsetUrl = onnxSynsetUrl;
    }
}
