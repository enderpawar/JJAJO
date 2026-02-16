package com.jjajo.presentation.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * /api/me 요청 시 Origin, User-Agent, Cookie 유무를 로그.
 * 모바일 vs 데스크톱 로그인 차이 진단용 (Render 로그에서 확인 가능)
 */
public class LoginDiagnosticFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(LoginDiagnosticFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!"/api/me".equals(path)) {
            filterChain.doFilter(request, response);
            return;
        }
        String origin = request.getHeader("Origin");
        String ua = request.getHeader("User-Agent");
        boolean hasCookie = (request.getHeader("Cookie") != null && !request.getHeader("Cookie").isBlank());
        String uaShort = (ua != null && ua.length() > 60) ? ua.substring(0, 60) + "..." : ua;
        log.info("[LOGIN-DIAG] /api/me origin={} hasCookie={} userAgent={}", origin, hasCookie, uaShort);
        filterChain.doFilter(request, response);
    }
}
