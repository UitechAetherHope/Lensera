package com.photoblog.springboot_photo.pojo.dto;

/** POST /api/blog-posts/convert-markdown 请求体 */
public record MarkdownConvertRequest(String text) {}
