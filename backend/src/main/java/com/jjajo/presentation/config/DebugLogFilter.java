package com.jjajo.presentation.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.util.HashMap;
import java.util.Map;

/**
 * 디버그: /api 요청 시 SecurityContext 인증 상태를 SLF4J 로거로 기록.
 * prod 프로필에서는 빈이 등록되지 않아 운영 환경에서 동작하지 않음.
 * Logback 비동기 로깅으로 전달. logback-spring.xml에서 파일 출력 설정.
 */
@Component
@Profile("!prod")
public class DebugLogFilter extends OncePerRequestFilter {

    private static final Logger DEBUG_LOG = LoggerFactory.getLogger("com.jjajo.debug");

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, java.io.IOException {
        String path = request.getRequestURI();
        if (!path.startsWith("/api")) {
            filterChain.doFilter(request, response);
            return;
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean authNull = (auth == null);
        String principalClass = (auth != null && auth.getPrincipal() != null)
            ? auth.getPrincipal().getClass().getSimpleName() : null;
        String userId = SecurityConfig.extractUserId(auth);
        boolean hasCookie = (request.getHeader("Cookie") != null);

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("location", "DebugLogFilter");
            payload.put("message", "api request");
            Map<String, Object> data = new HashMap<>();
            data.put("path", path);
            data.put("authNull", authNull);
            data.put("principalClass", principalClass);
            data.put("userId", userId);
            data.put("hasCookie", hasCookie);
            payload.put("data", data);
            payload.put("timestamp", System.currentTimeMillis());
            payload.put("sessionId", "debug-session");
            payload.put("hypothesisId", "C");
            String line = new ObjectMapper().writeValueAsString(payload);
            DEBUG_LOG.debug(line);
        } catch (Exception ignored) {
        }
        filterChain.doFilter(request, response);
    }
}
