package com.photoblog.springboot_photo.pojo.dto;

import java.time.Instant;
import java.util.List;

/** 博客卡片列表（对齐前端 Blog.jsx / MineBlogPanel 字段） */
public record BlogPostListItemResponse(
        Long blogId,
        String category,
        String title,
        String excerpt,
        String author,
        Long authorPublicId,
        String date,
        String views,
        int comments,
        String imageUrl,
        List<String> tags,
        String status,
        String coverName,
        Long coverByteSize,
        String coverMime,
        Instant updatedAt) {}
