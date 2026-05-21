package com.photoblog.springboot_photo.repostity;

import com.photoblog.springboot_photo.pojo.UserFollow;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserFollowRepository extends CrudRepository<UserFollow, Long> {

    long countByFolloweeId(Integer followeeId);

    long countByFollowerId(Integer followerId);

    boolean existsByFollowerIdAndFolloweeId(Integer followerId, Integer followeeId);

    void deleteByFollowerIdAndFolloweeId(Integer followerId, Integer followeeId);
}
