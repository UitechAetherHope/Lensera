package com.photoblog.springboot_photo.service;

import com.photoblog.springboot_photo.pojo.User;
import com.photoblog.springboot_photo.pojo.dto.UserDto;

//加接口，增强扩展性
public interface IUserService {

    /**
     * 插入用户
     *
     * @param user 参数
     * @return
     */
    User add(UserDto user);

    /**
     * 查询用户
     * @param userId 用户ID
     * @return
     */
    User getUser(Integer userId);

    /**
     * 修改用户
     * @param user 需要修改的用户对象
     * @return
     */
    User edit(UserDto user);

    /**
     * 删除用户
     *
     * @param userId 需要删除的对象
     */
    void delete(Integer userId);
}
