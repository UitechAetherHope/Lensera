package com.photoblog.springboot_photo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;
import java.util.Arrays;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${app.upload.root:./data/upload-root}")
    private String uploadRoot;

    @Value("${app.cors.allowed-origin-patterns:http://localhost:5173,http://127.0.0.1:5173}")
    private String corsAllowedOriginPatterns;

    /** 本地作品文件：URL /files/** 映射到 app.upload.root 目录下 */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String loc = Paths.get(uploadRoot).toAbsolutePath().normalize().toUri().toString();
        if (!loc.endsWith("/")) {
            loc = loc + "/";
        }
        registry.addResourceHandler("/files/**").addResourceLocations(loc);
    }

    /** 开发：Vite 跨域；Docker：默认同源，可用 app.cors.allowed-origin-patterns 覆盖 */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins =
                Arrays.stream(corsAllowedOriginPatterns.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toArray(String[]::new);
        registry.addMapping("/api/**")
                .allowedOriginPatterns(origins)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(false)
                .maxAge(3600);
        registry.addMapping("/files/**")
                .allowedOriginPatterns(origins)
                .allowedMethods("GET", "HEAD", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(false)
                .maxAge(3600);
    }
}
