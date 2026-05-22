package com.photoblog.springboot_photo;

import com.photoblog.springboot_photo.config.VisionCategoryProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(VisionCategoryProperties.class)
//Springboot 启动类(唯一入口类)
public class SpringbootPhotoApplication {

    public static void main(String[] args) {
        SpringApplication.run(SpringbootPhotoApplication.class, args);
    }

}
