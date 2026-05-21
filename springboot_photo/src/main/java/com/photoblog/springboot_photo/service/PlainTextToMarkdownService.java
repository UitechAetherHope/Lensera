package com.photoblog.springboot_photo.service;

import com.photoblog.springboot_photo.exception.ApiException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 将用户从 AI / Word / 网页复制的纯文本智能转为 Markdown，便于博客块编辑器解析。
 */
@Service
public class PlainTextToMarkdownService {

    private static final int MAX_INPUT_CHARS = 200_000;

    private static final Pattern MD_HEADING = Pattern.compile("^(#{1,6})\\s+(.+)$");
    private static final Pattern MD_QUOTE = Pattern.compile("^>\\s*(.+)$");
    private static final Pattern MD_UL = Pattern.compile("^[-*+]\\s+(.+)$");
    private static final Pattern MD_OL = Pattern.compile("^\\d+\\.\\s+(.+)$");
    private static final Pattern CN_CHAPTER =
            Pattern.compile("^[一二三四五六七八九十百千万]+[、.．]\\s*(.+)$");
    private static final Pattern CN_PART =
            Pattern.compile("^第[一二三四五六七八九十百千万\\d]+[章节部分篇][、.．]?\\s*(.*)$");
    private static final Pattern NUM_SECTION = Pattern.compile("^\\d+[、.．)]\\s*(.+)$");
    private static final Pattern BULLET_CHAR = Pattern.compile("^[•·▪◦]\\s*(.+)$");

    public String convert(String raw) {
        if (raw == null) {
            return "";
        }
        String text = raw.replace("\r\n", "\n").replace('\r', '\n');
        if (text.length() > MAX_INPUT_CHARS) {
            throw new ApiException(400, "文本过长，请分段转换（不超过 20 万字）");
        }
        if (text.isBlank()) {
            return "";
        }

        String[] lines = text.split("\n", -1);
        StringBuilder out = new StringBuilder();
        List<String> paragraphLines = new ArrayList<>();

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) {
                flushParagraph(out, paragraphLines);
                continue;
            }

            String converted = tryConvertStructuralLine(trimmed);
            if (converted != null) {
                flushParagraph(out, paragraphLines);
                appendBlock(out, converted);
                continue;
            }

            paragraphLines.add(line);
        }
        flushParagraph(out, paragraphLines);
        return out.toString().trim();
    }

    /** @return Markdown 行或块；null 表示并入段落 */
    private String tryConvertStructuralLine(String trimmed) {
        Matcher m;

        m = MD_HEADING.matcher(trimmed);
        if (m.matches()) {
            return m.group(1) + " " + polishInline(m.group(2));
        }

        m = MD_QUOTE.matcher(trimmed);
        if (m.matches()) {
            return "> " + polishInline(m.group(1));
        }

        m = MD_UL.matcher(trimmed);
        if (m.matches()) {
            return "- " + polishInline(m.group(1));
        }

        m = MD_OL.matcher(trimmed);
        if (m.matches()) {
            return "- " + polishInline(m.group(1));
        }

        m = BULLET_CHAR.matcher(trimmed);
        if (m.matches()) {
            return "- " + polishInline(m.group(1));
        }

        m = CN_CHAPTER.matcher(trimmed);
        if (m.matches()) {
            return "## " + polishInline(m.group(1));
        }

        m = CN_PART.matcher(trimmed);
        if (m.matches()) {
            String rest = m.group(1).trim();
            String title = rest.isEmpty() ? trimmed : rest;
            return "## " + polishInline(title);
        }

        m = NUM_SECTION.matcher(trimmed);
        if (m.matches() && trimmed.length() <= 120) {
            return "### " + polishInline(m.group(1));
        }

        if (looksLikeStandaloneTitle(trimmed)) {
            return "## " + polishInline(trimmed);
        }

        return null;
    }

    private static boolean looksLikeStandaloneTitle(String line) {
        if (line.length() > 48) {
            return false;
        }
        if (line.endsWith("。") || line.endsWith("；") || line.endsWith("，") || line.endsWith("：")) {
            return false;
        }
        if (line.endsWith("?") || line.endsWith("？") || line.endsWith("!") || line.endsWith("！")) {
            return false;
        }
        if (line.matches(".*[.!?。！？]$") && line.length() > 20) {
            return false;
        }
        return !line.contains("：") || line.length() <= 24;
    }

    private void flushParagraph(StringBuilder out, List<String> lines) {
        if (lines.isEmpty()) {
            return;
        }
        String joined = String.join("\n", lines).trim();
        if (joined.isEmpty()) {
            lines.clear();
            return;
        }
        if (out.length() > 0) {
            out.append("\n\n");
        }
        out.append(polishInline(joined));
        lines.clear();
    }

    private void appendBlock(StringBuilder out, String block) {
        if (block == null || block.isBlank()) {
            return;
        }
        if (out.length() > 0) {
            out.append("\n\n");
        }
        out.append(block);
    }

    /**
     * 常见 AI 输出中的强调符号 → Markdown 行内语法
     */
    static String polishInline(String text) {
        if (text == null || text.isEmpty()) {
            return "";
        }
        String s = text;
        s = s.replace("【", "**").replace("】", "**");
        s = s.replace("「", "*").replace("」", "*");
        s = Pattern.compile("\\*\\*\\s+\\*\\*").matcher(s).replaceAll("");
        return s.trim();
    }
}
