package com.photoblog.springboot_photo.util;

import com.photoblog.springboot_photo.exception.ApiException;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Optional;

@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expirationMs;

    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String createToken(Integer userId, String userName) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("userName", userName)
                .issuedAt(new Date(now))
                .expiration(new Date(now + expirationMs))
                .signWith(key)
                .compact();
    }

    /** 从 Authorization: Bearer token 解析主键 userId（subject） */
    public Integer parseUserIdFromAuthorization(String authorization) {
        if (authorization == null || !authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            throw new ApiException(401, "未登录或 Token 格式错误");
        }
        String token = authorization.substring(7).trim();
        if (token.isEmpty()) {
            throw new ApiException(401, "未登录");
        }
        try {
            return Integer.valueOf(
                    Jwts.parser()
                            .verifyWith(key)
                            .build()
                            .parseSignedClaims(token)
                            .getPayload()
                            .getSubject());
        } catch (ExpiredJwtException e) {
            throw new ApiException(401, "登录已过期，请重新登录");
        } catch (JwtException e) {
            throw new ApiException(401, "Token 无效");
        } catch (NumberFormatException e) {
            throw new ApiException(401, "Token 无效");
        }
    }

    /** 无 Bearer 或 Token 无效时视为匿名，不抛 401（用于公开接口的可选登录态） */
    public Optional<Integer> parseUserIdOptional(String authorization) {
        if (authorization == null || !authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return Optional.empty();
        }
        try {
            return Optional.of(parseUserIdFromAuthorization(authorization));
        } catch (ApiException e) {
            return Optional.empty();
        }
    }
}
