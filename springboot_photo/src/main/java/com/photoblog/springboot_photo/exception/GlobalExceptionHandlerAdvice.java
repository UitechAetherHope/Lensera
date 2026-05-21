package com.photoblog.springboot_photo.exception;

import com.photoblog.springboot_photo.pojo.ResponseMessage;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;


@RestControllerAdvice   //统一处理
public class GlobalExceptionHandlerAdvice {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandlerAdvice.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ResponseMessage<Object>> handleApi(ApiException e) {
        log.warn("业务异常 status={} msg={}", e.getHttpStatus(), e.getMessage());
        return ResponseEntity
                .status(e.getHttpStatus())
                .body(new ResponseMessage<>(e.getHttpStatus(), e.getMessage(), null));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ResponseMessage<Object>> handleValid(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(err -> err.getDefaultMessage())
                .orElse("参数校验失败");
        log.warn("参数校验: {}", msg);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ResponseMessage<>(HttpStatus.BAD_REQUEST.value(), msg, null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseMessage<Object> handlerException(Exception e, HttpServletRequest request, HttpServletResponse response) {
        log.error("未处理异常 path={}", request.getRequestURI(), e);
        return new ResponseMessage<>(HttpStatus.INTERNAL_SERVER_ERROR.value(), "服务器内部错误", null);
    }
}
