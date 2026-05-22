package com.photoblog.springboot_photo.repostity;

import com.photoblog.springboot_photo.pojo.WorkLike;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface WorkLikeRepository extends CrudRepository<WorkLike, Long> {

    boolean existsByWorkIdAndUserId(Long workId, Integer userId);

    /** 当前用户对一批作品中已点赞的 work_id（用于列表批量填充 likedByMe，避免 N+1） */
    @Query("SELECT wl.workId FROM WorkLike wl WHERE wl.userId = :userId AND wl.workId IN :workIds")
    List<Long> findWorkIdsByUserIdAndWorkIdIn(
            @Param("userId") Integer userId, @Param("workIds") Collection<Long> workIds);

    void deleteByWorkIdAndUserId(Long workId, Integer userId);

    void deleteByWorkId(Long workId);

    /** 当前用户点赞记录，按点赞时间倒序（用于「喜欢」页） */
    List<WorkLike> findByUserIdOrderByCreatedAtDesc(Integer userId);
}
