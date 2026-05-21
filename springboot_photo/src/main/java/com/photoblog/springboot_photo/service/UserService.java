package com.photoblog.springboot_photo.service;
//  业务逻辑层

import com.photoblog.springboot_photo.pojo.User;
import com.photoblog.springboot_photo.pojo.dto.UserDto;
import com.photoblog.springboot_photo.repostity.UserReposity;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service  //spring的bean 表示业务逻辑类的bean
public class UserService implements IUserService{  // Alt+Enter快速查错快速生成

    @Autowired
    UserReposity userReposity;

    @Override
    public User add(UserDto user) {

        User userPojo=new User();
        BeanUtils.copyProperties(user,userPojo);
        return userReposity.save(userPojo);
        //  调用数据
    }

    @Override
    public User getUser(Integer userId) {
        return userReposity.findById(userId).orElseThrow(() -> {
            throw new IllegalArgumentException("用户不存在，参数异常");
        });

    }

    @Override
    public User edit(UserDto user) {
        User userPojo=new User();
        BeanUtils.copyProperties(user,userPojo);
        return userReposity.save(userPojo);     //  插入和修改都是调用save方法,save方法允许接受Pojo类型
    }

    @Override
    public void delete(Integer userId) {
        userReposity.deleteById(userId);
    }
}
