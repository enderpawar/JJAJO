package com.jjajo.presentation.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.HashMap;
import java.util.Map;

/**
 * 디버그: /api 요청 시 SecurityContext 인증 상태를 .cursor/debug.log에 기록
 */
@Component
public class DebugLogFilter extends OncePerRequestFilter {

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
            Path base = Paths.get(System.getProperty("user.dir"));
            if (base.getFileName() != null && "backend".equals(base.getFileName().toString())) {
                base = base.getParent();
            }
            String logPath = System.getenv("DEBUG_LOG_PATH");
            if (logPath == null) logPath = base.resolve(".cursor").resolve("debug.log").toString();

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
            String line = new ObjectMapper().writeValueAsString(payload) + "\n";
            Files.write(Path.of(logPath), line.getBytes(StandardCharsets.UTF_8),
                StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (Exception ignored) {
        }
        filterChain.doFilter(request, response);
    }
}
