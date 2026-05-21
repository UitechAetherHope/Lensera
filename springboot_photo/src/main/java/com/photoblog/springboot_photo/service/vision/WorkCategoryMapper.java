package com.photoblog.springboot_photo.service.vision;

import java.util.Locale;
import java.util.Set;

/** 将大模型回复映射为作品流五类标签 */
public final class WorkCategoryMapper {

    public static final Set<String> FEED_CATEGORIES = Set.of("风景", "人物", "动物", "街拍", "静物");

    private static final String PROMPT =
            """
            你是摄影社区作品分类助手。请根据图片画面内容，从下面 5 个标签中选出最贴切的一个：
            风景、人物、动物、街拍、静物

            规则：
            - 自然风光、山川、湖泊、建筑远景等多为「风景」
            - 以人为主体的人像、合影为「人物」
            - 猫狗鸟兽等为「动物」
            - 街头纪实、城市街景人文为「街拍」
            - 静物、产品、美食特写等为「静物」
            - 只输出一个标签词，不要标点、不要解释、不要输出其他文字
            """;

    private WorkCategoryMapper() {}

    public static String classificationPrompt() {
        return PROMPT;
    }

    /**
     * @return 五类之一，无法识别时 null
     */
    public static String mapModelTextToCategory(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String t = text.trim().replace("\"", "").replace("'", "");
        if (t.length() > 32) {
            t = t.substring(0, 32);
        }
        for (String c : FEED_CATEGORIES) {
            if (t.equals(c) || t.contains(c)) {
                return c;
            }
        }
        String lower = t.toLowerCase(Locale.ROOT);
        if (t.contains("人像") || lower.contains("portrait") || t.contains("人物")) {
            return "人物";
        }
        if (t.contains("街景") || t.contains("街拍") || lower.contains("street")) {
            return "街拍";
        }
        if (t.contains("风光") || t.contains("风景") || lower.contains("landscape")) {
            return "风景";
        }
        if (t.contains("动物") || lower.contains("animal")) {
            return "动物";
        }
        if (t.contains("静物") || lower.contains("still")) {
            return "静物";
        }
        return null;
    }

    /** 从标题、文案推断标签（API 失败时的兜底） */
    public static String inferFromTitleCaption(String title, String caption) {
        String combined =
                ((title != null ? title : "") + " " + (caption != null ? caption : "")).trim();
        if (combined.isEmpty()) {
            return null;
        }
        return mapModelTextToCategory(combined);
    }
}
