package com.photoblog.springboot_photo.service;

import ai.djl.modality.Classifications;
import ai.djl.modality.Classifications.Classification;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * ImageNet Top-K → 业务六大类：动物、人像、风景、街景、静物、其他。
 * <p>
 * 单条类名判定顺序：{@code synset_coarse_override.properties} 中的 synset 覆盖 → 人像 → 动物 → 街景 → 风景 → 静物 → 其他。
 * 聚合：Top-8 概率对各桶加权，票数归一为六维特征。
 */
@Component
public class ImagenetCoarseLabelMapper {

    private static final Logger log = LoggerFactory.getLogger(ImagenetCoarseLabelMapper.class);

    public static final String ZH_ANIMAL = "动物";
    public static final String ZH_PORTRAIT = "人像";
    public static final String ZH_LANDSCAPE = "风景";
    public static final String ZH_STREET = "街景";
    public static final String ZH_STILL = "静物";
    public static final String ZH_OTHER = "其他";

    /**
     * 将 AI 六大类映射为作品流手选分类（{@link WorkService} 白名单）。
     * 人像→人物、街景→街拍；「其他」不入库分类。
     */
    public static String coarseZhToWorkCategory(String coarseZh) {
        if (coarseZh == null || coarseZh.isBlank()) {
            return null;
        }
        return switch (coarseZh.trim()) {
            case ZH_ANIMAL -> "动物";
            case ZH_PORTRAIT -> "人物";
            case ZH_LANDSCAPE -> "风景";
            case ZH_STREET -> "街拍";
            case ZH_STILL -> "静物";
            default -> null;
        };
    }

    /** 平局优先：人像 > 动物 > 风景 > 街景 > 静物 > 其他 */
    private static final List<String> ORDER =
            List.of(ZH_PORTRAIT, ZH_ANIMAL, ZH_LANDSCAPE, ZH_STREET, ZH_STILL, ZH_OTHER);

    private static final Pattern SYNSET_HEAD = Pattern.compile("^n(\\d{8})\\b");

    private final Map<String, String> synsetOverride = new LinkedHashMap<>();
    private List<String> portraitHints = List.of();
    private List<String> animalHints = List.of();
    private List<String> streetHints = List.of();
    private List<String> natureHints = List.of();
    private List<String> stillHints = List.of();

    @PostConstruct
    void loadRules() {
        try {
            Properties p = new Properties();
            var res = new ClassPathResource("cv/coarse/synset_coarse_override.properties");
            if (res.exists()) {
                try (var in = new InputStreamReader(res.getInputStream(), StandardCharsets.UTF_8)) {
                    p.load(in);
                }
                for (String k : p.stringPropertyNames()) {
                    String key = k.trim();
                    if (key.isEmpty()) {
                        continue;
                    }
                    String v = p.getProperty(k, "").trim();
                    Matcher m = SYNSET_HEAD.matcher(key);
                    if (!m.find()) {
                        continue;
                    }
                    String id = m.group(1);
                    if (!isValidBucket(v)) {
                        log.warn("skip invalid coarse override {}={}", k, v);
                        continue;
                    }
                    synsetOverride.put(id, v);
                }
            }
        } catch (Exception e) {
            log.warn("load synset_coarse_override.properties failed: {}", e.toString());
        }

        portraitHints = loadHintLines("cv/coarse/portrait_hints.txt");
        animalHints = loadHintLines("cv/coarse/animal_hints.txt");
        streetHints = loadHintLines("cv/coarse/street_hints.txt");
        natureHints = loadHintLines("cv/coarse/nature_hints.txt");
        stillHints = loadHintLines("cv/coarse/still_hints.txt");
        log.info(
                "coarse mapper(6): overrides={}, portrait={}, animal={}, street={}, nature={}, still={}",
                synsetOverride.size(),
                portraitHints.size(),
                animalHints.size(),
                streetHints.size(),
                natureHints.size(),
                stillHints.size());
    }

    public CoarseLabelResult map(Classifications classifications) {
        List<Classification> top = classifications.topK(8);
        Map<String, Double> votes = new LinkedHashMap<>();
        for (String k : ORDER) {
            votes.put(k, 0.0);
        }
        for (Classification c : top) {
            String line = c.getClassName();
            if (line == null) {
                continue;
            }
            double p = c.getProbability();
            if (!Double.isFinite(p) || p < 0) {
                p = 0.0;
            }
            String bucket = classifyOneLine(line.toLowerCase(Locale.ROOT));
            votes.merge(bucket, p, Double::sum);
        }
        double sum = votes.values().stream().mapToDouble(Double::doubleValue).sum();
        double fa;
        double fp;
        double fl;
        double fs;
        double fst;
        double fo;
        if (sum < 1e-9) {
            fa = fp = fl = fs = fst = 0.0;
            fo = 1.0;
        } else {
            fa = votes.get(ZH_ANIMAL) / sum;
            fp = votes.get(ZH_PORTRAIT) / sum;
            fl = votes.get(ZH_LANDSCAPE) / sum;
            fs = votes.get(ZH_STREET) / sum;
            fst = votes.get(ZH_STILL) / sum;
            fo = votes.get(ZH_OTHER) / sum;
        }
        fa = clamp01Finite(fa);
        fp = clamp01Finite(fp);
        fl = clamp01Finite(fl);
        fs = clamp01Finite(fs);
        fst = clamp01Finite(fst);
        fo = clamp01Finite(fo);
        double s2 = fa + fp + fl + fs + fst + fo;
        if (s2 > 1e-9) {
            fa /= s2;
            fp /= s2;
            fl /= s2;
            fs /= s2;
            fst /= s2;
            fo /= s2;
        } else {
            fa = fp = fl = fs = fst = 0.0;
            fo = 1.0;
        }
        String winner =
                votes.entrySet().stream()
                        .max(Comparator.<Map.Entry<String, Double>>comparingDouble(Map.Entry::getValue)
                                .thenComparingInt(e -> -ORDER.indexOf(e.getKey())))
                        .map(Map.Entry::getKey)
                        .orElse(ZH_OTHER);
        double winScore =
                switch (winner) {
                    case ZH_ANIMAL -> fa;
                    case ZH_PORTRAIT -> fp;
                    case ZH_LANDSCAPE -> fl;
                    case ZH_STREET -> fs;
                    case ZH_STILL -> fst;
                    default -> fo;
                };
        winScore = clamp01Finite(winScore);
        return new CoarseLabelResult(winner, winScore, fa, fp, fl, fs, fst, fo);
    }

    private static double clamp01Finite(double x) {
        if (!Double.isFinite(x)) {
            return 0.0;
        }
        return Math.min(1.0, Math.max(0.0, x));
    }

    private String classifyOneLine(String lineLower) {
        Matcher sm = SYNSET_HEAD.matcher(lineLower);
        if (sm.find()) {
            String id = sm.group(1);
            String o = synsetOverride.get(id);
            if (o != null) {
                return o;
            }
        }
        if (containsAnyHint(lineLower, portraitHints)) {
            return ZH_PORTRAIT;
        }
        if (containsAnyHint(lineLower, animalHints)) {
            return ZH_ANIMAL;
        }
        if (containsAnyHint(lineLower, streetHints)) {
            return ZH_STREET;
        }
        if (containsAnyHint(lineLower, natureHints)) {
            return ZH_LANDSCAPE;
        }
        if (containsAnyHint(lineLower, stillHints)) {
            return ZH_STILL;
        }
        return ZH_OTHER;
    }

    private static boolean containsAnyHint(String lineLower, List<String> hints) {
        for (String h : hints) {
            if (h == null || h.isEmpty()) {
                continue;
            }
            if (lineLower.contains(h)) {
                return true;
            }
        }
        return false;
    }

    private static List<String> loadHintLines(String classpath) {
        List<String> raw = new ArrayList<>();
        try {
            var res = new ClassPathResource(classpath);
            if (!res.exists()) {
                return List.of();
            }
            try (BufferedReader br = new BufferedReader(new InputStreamReader(res.getInputStream(), StandardCharsets.UTF_8))) {
                String ln;
                while ((ln = br.readLine()) != null) {
                    ln = ln.trim();
                    if (ln.isEmpty() || ln.startsWith("#")) {
                        continue;
                    }
                    raw.add(ln.toLowerCase(Locale.ROOT));
                }
            }
        } catch (Exception e) {
            LoggerFactory.getLogger(ImagenetCoarseLabelMapper.class).warn("load {}: {}", classpath, e.toString());
        }
        raw.sort(Comparator.comparingInt(String::length).reversed());
        return List.copyOf(raw);
    }

    private static boolean isValidBucket(String v) {
        return ZH_ANIMAL.equals(v)
                || ZH_PORTRAIT.equals(v)
                || ZH_LANDSCAPE.equals(v)
                || ZH_STREET.equals(v)
                || ZH_STILL.equals(v)
                || ZH_OTHER.equals(v);
    }

    /**
     * @param zhLabel 胜出大类
     * @param winnerScore 胜出类归一得分（≈置信度）
     * @param featAnimal 六维特征，和为 1
     */
    public record CoarseLabelResult(
            String zhLabel,
            double winnerScore,
            double featAnimal,
            double featPortrait,
            double featLandscape,
            double featStreet,
            double featStill,
            double featOther) {}
}
