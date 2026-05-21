package com.photoblog.springboot_photo.repostity;

import com.photoblog.springboot_photo.pojo.BlogComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BlogCommentRepository extends JpaRepository<BlogComment, Long> {

    List<BlogComment> findByBlogIdAndStatusOrderByCreatedAtAsc(Long blogId, int status);

    long countByBlogIdAndStatus(Long blogId, int status);
}
