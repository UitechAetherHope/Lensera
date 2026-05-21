package com.photoblog.springboot_photo.pojo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "tb_work")
public class Work {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "work_id")
    private Long workId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "title", nullable = false, length = 128)
    private String title;

    @Column(name = "caption", columnDefinition = "TEXT")
    private String caption;

    /** 相对上传根目录的路径，如 users/{publicId}/works/2026/05/xxx.jpg；同用户下另有 avatar/、background/ 见 UserUploadPaths */
    @Column(name = "image_path", nullable = false, length = 512)
    private String imagePath;

    @Column(name = "category", length = 32)
    private String category;

    /** DJL 自动分类 Top1 英文类名（ImageNet 等），可为空 */
    @Column(name = "ai_label", length = 256)
    private String aiLabel;

    /** Top1 置信度 0~1 */
    @Column(name = "ai_score")
    private Double aiScore;

    /** TopK 概率 JSON 数组，如 [{"class":"...","probability":0.12},...] */
    @Column(name = "ai_top_k_json", columnDefinition = "TEXT")
    private String aiTopKJson;

    /** 映射后的大类：动物 / 人像 / 风景 / 街景 / 静物 / 其他 */
    @Column(name = "ai_coarse_zh", length = 16)
    private String aiCoarseZh;

    /** 胜出类的归一得分（≈置信度，0~1） */
    @Column(name = "ai_coarse_score")
    private Double aiCoarseScore;

    /** 六大类归一特征（与为 1；低置信强制「其他」时为 0,0,0,0,0,1） */
    @Column(name = "ai_feat_animal")
    private Double aiFeatAnimal;

    @Column(name = "ai_feat_portrait")
    private Double aiFeatPortrait;

    @Column(name = "ai_feat_landscape")
    private Double aiFeatLandscape;

    @Column(name = "ai_feat_street")
    private Double aiFeatStreet;

    @Column(name = "ai_feat_still")
    private Double aiFeatStill;

    @Column(name = "ai_feat_other")
    private Double aiFeatOther;

    @Column(name = "like_count", nullable = false)
    private int likeCount;

    /** 0 草稿 1 已发布 */
    @Column(name = "status", nullable = false)
    private int status = 1;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public Long getWorkId() {
        return workId;
    }

    public void setWorkId(Long workId) {
        this.workId = workId;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getCaption() {
        return caption;
    }

    public void setCaption(String caption) {
        this.caption = caption;
    }

    public String getImagePath() {
        return imagePath;
    }

    public void setImagePath(String imagePath) {
        this.imagePath = imagePath;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getAiLabel() {
        return aiLabel;
    }

    public void setAiLabel(String aiLabel) {
        this.aiLabel = aiLabel;
    }

    public Double getAiScore() {
        return aiScore;
    }

    public void setAiScore(Double aiScore) {
        this.aiScore = aiScore;
    }

    public String getAiTopKJson() {
        return aiTopKJson;
    }

    public void setAiTopKJson(String aiTopKJson) {
        this.aiTopKJson = aiTopKJson;
    }

    public String getAiCoarseZh() {
        return aiCoarseZh;
    }

    public void setAiCoarseZh(String aiCoarseZh) {
        this.aiCoarseZh = aiCoarseZh;
    }

    public Double getAiCoarseScore() {
        return aiCoarseScore;
    }

    public void setAiCoarseScore(Double aiCoarseScore) {
        this.aiCoarseScore = aiCoarseScore;
    }

    public Double getAiFeatAnimal() {
        return aiFeatAnimal;
    }

    public void setAiFeatAnimal(Double aiFeatAnimal) {
        this.aiFeatAnimal = aiFeatAnimal;
    }

    public Double getAiFeatPortrait() {
        return aiFeatPortrait;
    }

    public void setAiFeatPortrait(Double aiFeatPortrait) {
        this.aiFeatPortrait = aiFeatPortrait;
    }

    public Double getAiFeatLandscape() {
        return aiFeatLandscape;
    }

    public void setAiFeatLandscape(Double aiFeatLandscape) {
        this.aiFeatLandscape = aiFeatLandscape;
    }

    public Double getAiFeatStreet() {
        return aiFeatStreet;
    }

    public void setAiFeatStreet(Double aiFeatStreet) {
        this.aiFeatStreet = aiFeatStreet;
    }

    public Double getAiFeatStill() {
        return aiFeatStill;
    }

    public void setAiFeatStill(Double aiFeatStill) {
        this.aiFeatStill = aiFeatStill;
    }

    public Double getAiFeatOther() {
        return aiFeatOther;
    }

    public void setAiFeatOther(Double aiFeatOther) {
        this.aiFeatOther = aiFeatOther;
    }

    public int getLikeCount() {
        return likeCount;
    }

    public void setLikeCount(int likeCount) {
        this.likeCount = likeCount;
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
