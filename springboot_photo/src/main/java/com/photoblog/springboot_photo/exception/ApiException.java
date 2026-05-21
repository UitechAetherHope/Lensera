package com.photoblog.springboot_photo.exception;

/** 可控业务异常，由全局处理器映射为对应 HTTP 状态码 */
public class ApiException extends RuntimeException {
    private final int httpStatus;

    public ApiException(int httpStatus, String message) {
        super(message);
        this.httpStatus = httpStatus;
    }

    public int getHttpStatus() {
        return httpStatus;
    }
}
