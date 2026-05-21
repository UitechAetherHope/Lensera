package com.photoblog.springboot_photo.pojo.dto;

import java.time.Instant;
import java.util.List;

/** 博客详情（含 Markdown 正文） */
public record BlogPostResponse(
        Long blogId,
        String category,
        String title,
        String excerpt,
        String bodyMarkdown,
        String author,
        String date,
        String views,
        int comments,
        String coverUrl,
        List<String> tags,
        String status,
        String reviewNote,
        String coverName,
        Long coverByteSize,
        String coverMime,
        Instant createdAt,
        Instant updatedAt,
        Instant publishedAt) {}
