package com.photoblog.springboot_photo.repostity;

import com.photoblog.springboot_photo.pojo.User;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository  //spring的bean 表述数据访问曾的bean
public interface UserReposity extends CrudRepository<User, Integer> {

    Optional<User> findByUserName(String userName);

    Optional<User> findByEmail(String email);

    /** 用户名精确匹配或邮箱忽略大小写匹配（用于「邮箱/账号」登录） */
    @Query("SELECT u FROM User u WHERE u.userName = :q OR LOWER(u.email) = LOWER(:q)")
    Optional<User> findByUserNameOrEmail(@Param("q") String q);

    @Query("SELECT MAX(u.publicId) FROM User u")
    Optional<Long> findMaxPublicId();

    boolean existsByPublicId(Long publicId);

    Optional<User> findByPublicId(Long publicId);

    /** 批量加载作者，避免作品流 N+1 */
    List<User> findByUserIdIn(Collection<Integer> userIds);
}
