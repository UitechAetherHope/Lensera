package com.photoblog.springboot_photo.pojo;

import org.springframework.http.HttpStatus;

public class ResponseMessage<T> {
    private Integer code; //  常见响应编码： {200-成功  500-内部服务器错误  404-没有请求资源}
    private String message; //  请求成功
    private T data; //制定泛型

    public ResponseMessage() {
    }

    public ResponseMessage(Integer code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    public static<T> ResponseMessage<T> success(T data){
        ResponseMessage responseMessage = new ResponseMessage();
        responseMessage.setCode(HttpStatus.OK.value());  // OK代表200
        responseMessage.setMessage("success!");
        responseMessage.setData(data);
        return responseMessage;
    }
    public static<T> ResponseMessage<T> success(){
        return new ResponseMessage(HttpStatus.OK.value(),"success",null);

    }

    public Integer getCode() {
        return code;
    }

    public void setCode(Integer code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }
}
