package com.photoblog.springboot_photo.repostity;

import com.photoblog.springboot_photo.pojo.BlogCommentLike;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface BlogCommentLikeRepository extends CrudRepository<BlogCommentLike, Long> {

    boolean existsByCommentIdAndUserId(Long commentId, Integer userId);

    void deleteByCommentIdAndUserId(Long commentId, Integer userId);

    @Query("SELECT cl.commentId FROM BlogCommentLike cl WHERE cl.userId = :userId AND cl.commentId IN :ids")
    List<Long> findCommentIdsByUserIdAndCommentIdIn(
            @Param("userId") Integer userId, @Param("ids") Collection<Long> commentIds);

    List<BlogCommentLike> findAllByCommentId(Long commentId);
}
