package com.photoblog.springboot_photo.repostity;

import com.photoblog.springboot_photo.pojo.WorkComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkCommentRepository extends JpaRepository<WorkComment, Long> {

    List<WorkComment> findByWorkIdAndStatusOrderByCreatedAtAsc(Long workId, int status);

    long countByWorkIdAndStatus(Long workId, int status);
}
