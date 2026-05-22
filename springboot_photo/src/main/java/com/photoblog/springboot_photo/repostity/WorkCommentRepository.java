package com.photoblog.springboot_photo.repostity;

import com.photoblog.springboot_photo.pojo.WorkComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

@Repository
public interface WorkCommentRepository extends JpaRepository<WorkComment, Long> {

    List<WorkComment> findByWorkIdAndStatusOrderByCreatedAtAsc(Long workId, int status);

    long countByWorkIdAndStatus(Long workId, int status);

    @Query(
            """
            SELECT c FROM WorkComment c
            WHERE c.workId IN :workIds AND c.userId <> :ownerId AND c.status = 1
            ORDER BY c.createdAt DESC
            """)
    List<WorkComment> findIncomingOnWorks(
            @Param("workIds") Collection<Long> workIds,
            @Param("ownerId") Integer ownerId,
            Pageable pageable);
}
