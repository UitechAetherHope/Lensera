package com.photoblog.springboot_photo.repostity;

import com.photoblog.springboot_photo.pojo.BlogView;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlogViewRepository extends JpaRepository<BlogView, Long> {

    boolean existsByBlogIdAndViewerKey(Long blogId, String viewerKey);
}
