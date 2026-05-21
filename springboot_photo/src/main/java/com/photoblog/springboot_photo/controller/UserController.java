package com.photoblog.springboot_photo.controller;

import com.photoblog.springboot_photo.pojo.ResponseMessage;
import com.photoblog.springboot_photo.pojo.User;
import com.photoblog.springboot_photo.pojo.dto.UserDto;
import com.photoblog.springboot_photo.service.IUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController  //允许接口方法可返回对象，且对象转JSON文本
@RequestMapping("/user")  //  localhost:8080/user/**
public class UserController {

    @Autowired
    IUserService userService;

    //Rest
    //增加
    //@PostMapping
    @PostMapping        //URL:localhost:8080/user   method:post
    public ResponseMessage add(@Validated @RequestBody UserDto user){
        //业务逻辑层add方法
        User userAdd = userService.add(user);
        return ResponseMessage.success(userAdd);
    }
    //查询
    //@GetMapping
    @GetMapping("/{userId}")        //URL:localhost:8080/user/1   method:get
    public ResponseMessage get(@PathVariable Integer userId){
        //业务逻辑层add方法
        User userNew = userService.getUser(userId);
        return ResponseMessage.success(userNew);
    }
    //修改
    //@PutMapping
    @PutMapping     //URL:localhost:8080/user/1   method:get
    public ResponseMessage edit(@Validated @RequestBody UserDto user){
        //业务逻辑层edit方法
        User userNew = userService.edit(user);
        return ResponseMessage.success(userNew);
    }
    //删除
    @DeleteMapping("/{userId}")
    public ResponseMessage delete(@PathVariable Integer userId){
        //业务逻辑层add方法
        userService.delete(userId);
        return ResponseMessage.success();
    }

}
