package com.photoblog.springboot_photo.repostity;

import com.photoblog.springboot_photo.pojo.Work;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface WorkRepository extends CrudRepository<Work, Long> {

    List<Work> findByUserIdAndStatusOrderByCreatedAtDesc(Integer userId, int status);

    List<Work> findByUserIdOrderByCreatedAtDesc(Integer userId);

    /** 全站已发布作品流（当前先全量按时间倒序；后续可改分页/推荐） */
    List<Work> findByStatusOrderByCreatedAtDesc(int status);

    List<Work> findByStatusAndCategoryOrderByCreatedAtDesc(int status, String category);

    @Query("SELECT COALESCE(SUM(w.likeCount), 0) FROM Work w WHERE w.userId = :userId AND w.status = 1")
    long sumLikeCountPublishedByUserId(@Param("userId") Integer userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query(
            "UPDATE Work w SET w.aiLabel = :label, w.aiScore = :score, w.aiTopKJson = :topk, "
                    + "w.aiCoarseZh = :coarseZh, w.aiCoarseScore = :coarseScore, "
                    + "w.aiFeatAnimal = :fa, w.aiFeatPortrait = :fp, w.aiFeatLandscape = :fl, "
                    + "w.aiFeatStreet = :fst, w.aiFeatStill = :fsi, w.aiFeatOther = :fo, "
                    + "w.category = :category "
                    + "WHERE w.workId = :id")
    int updateAiPrediction(
            @Param("id") Long workId,
            @Param("label") String label,
            @Param("score") Double score,
            @Param("topk") String topKJson,
            @Param("coarseZh") String coarseZh,
            @Param("coarseScore") Double coarseScore,
            @Param("fa") Double featAnimal,
            @Param("fp") Double featPortrait,
            @Param("fl") Double featLandscape,
            @Param("fst") Double featStreet,
            @Param("fsi") Double featStill,
            @Param("fo") Double featOther,
            @Param("category") String category);
}
