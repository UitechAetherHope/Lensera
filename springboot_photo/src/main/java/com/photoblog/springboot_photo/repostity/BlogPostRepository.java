package com.photoblog.springboot_photo.repostity;

import com.photoblog.springboot_photo.pojo.BlogPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BlogPostRepository extends JpaRepository<BlogPost, Long> {

    @Modifying
    @Query("UPDATE BlogPost p SET p.viewCount = p.viewCount + :delta WHERE p.blogId = :blogId")
    int incrementViewCount(@Param("blogId") Long blogId, @Param("delta") int delta);

    List<BlogPost> findByUserIdOrderByUpdatedAtDesc(Integer userId);

    List<BlogPost> findByUserIdAndStatusOrderByPublishedAtDescUpdatedAtDesc(Integer userId, int status);

    List<BlogPost> findByUserIdAndStatusInOrderByUpdatedAtDesc(Integer userId, List<Integer> statuses);

    List<BlogPost> findByStatusOrderByPublishedAtDescUpdatedAtDesc(int status);

    List<BlogPost> findByStatusOrderByViewCountDescPublishedAtDescUpdatedAtDesc(int status);

    List<BlogPost> findByStatusOrderByCommentCountDescPublishedAtDescUpdatedAtDesc(int status);
}
