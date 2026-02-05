package com.jjajo.presentation.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.util.Map;

/**
 * 404 발생 시 Whitelabel 대신:
 * - 브라우저 요청 → 프론트엔드로 리다이렉트
 * - API 요청 → JSON 404
 */
@ControllerAdvice
public class GlobalErrorHandler {

    @Value("${app.frontend-origin:http://localhost:5173}")
    private String frontendOrigin;

    @ExceptionHandler(NoHandlerFoundException.class)
    public Object handleNoHandlerFound(NoHandlerFoundException ex, HttpServletRequest request) {
        String path = request.getRequestURI();
        String accept = request.getHeader("Accept") != null ? request.getHeader("Accept") : "";

        boolean isApiRequest = path.startsWith("/api") || accept.contains(MediaType.APPLICATION_JSON_VALUE);

        if (isApiRequest) {
            return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("error", "Not Found", "path", path));
        }

        String target = (frontendOrigin != null && !frontendOrigin.isEmpty())
            ? frontendOrigin.replaceAll("/$", "") + "/"
            : "http://localhost:5173/";
        return ResponseEntity.status(HttpStatus.FOUND).location(java.net.URI.create(target)).build();
    }
}
