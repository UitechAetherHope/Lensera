package com.photoblog.springboot_photo.repostity;

import com.photoblog.springboot_photo.pojo.BlogComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

@Repository
public interface BlogCommentRepository extends JpaRepository<BlogComment, Long> {

    List<BlogComment> findByBlogIdAndStatusOrderByCreatedAtAsc(Long blogId, int status);

    long countByBlogIdAndStatus(Long blogId, int status);

    @Query(
            """
            SELECT c FROM BlogComment c
            WHERE c.blogId IN :blogIds AND c.userId <> :ownerId AND c.status = 1
            ORDER BY c.createdAt DESC
            """)
    List<BlogComment> findIncomingOnBlogs(
            @Param("blogIds") Collection<Long> blogIds,
            @Param("ownerId") Integer ownerId,
            Pageable pageable);
}
