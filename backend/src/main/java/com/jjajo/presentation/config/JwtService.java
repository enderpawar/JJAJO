package com.jjajo.presentation.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 발급 및 검증 (Safari 크로스 사이트 추적 방지 회피용 토큰 인증)
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    private final SecretKey secretKey;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    /**
     * userId, email, name, pictureUrl로 JWT 발급
     */
    public String generateToken(String userId, String email, String name, String pictureUrl) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(userId)
                .claim("email", email)
                .claim("name", name)
                .claim("picture", pictureUrl)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    /**
     * JWT 검증 후 Claims 반환. 유효하지 않으면 null.
     */
    public JwtClaims validateAndGetClaims(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String userId = claims.getSubject();
            if (userId == null || userId.isBlank()) {
                return null;
            }

            return new JwtClaims(
                    userId,
                    claims.get("email", String.class),
                    claims.get("name", String.class),
                    claims.get("picture", String.class)
            );
        } catch (ExpiredJwtException e) {
            log.debug("JWT expired: {}", e.getMessage());
            return null;
        } catch (JwtException e) {
            log.debug("JWT validation failed: {}", e.getMessage());
            return null;
        }
    }

    public record JwtClaims(String userId, String email, String name, String pictureUrl) {}
}
