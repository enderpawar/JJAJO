package com.jjajo.presentation.controller;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

/**
 * Whitelabel 대신 404 시 프론트로 리다이렉트.
 * Spring Boot가 /error 로 포워드한 뒤 이 컨트롤러가 처리한다.
 */
@Controller
public class CustomErrorController implements ErrorController {

    private static final Logger log = LoggerFactory.getLogger(CustomErrorController.class);

    @Value("${app.frontend-origin:http://localhost:5173}")
    private String frontendOrigin;

    @RequestMapping("${server.error.path:/error}")
    @ResponseBody
    public Object handleError(HttpServletRequest request) {
        Object statusObj = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        int status = statusObj != null ? Integer.parseInt(statusObj.toString()) : 500;
        String path = request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI) != null
            ? request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI).toString()
            : "";

        String accept = request.getHeader("Accept") != null ? request.getHeader("Accept") : "";
        boolean isBrowser = !path.startsWith("/api") && !accept.contains(MediaType.APPLICATION_JSON_VALUE);

        if (status == 404 && isBrowser) {
            String target = (frontendOrigin != null && !frontendOrigin.isEmpty())
                ? frontendOrigin.replaceAll("/$", "") + "/"
                : "http://localhost:5173/";
            // #region agent log
            try {
                String backendHost = request.getServerName() != null ? request.getServerName().toLowerCase() : "";
                java.net.URI targetUri = java.net.URI.create(target);
                String targetHost = targetUri.getHost() != null ? targetUri.getHost().toLowerCase() : "";
                if (targetHost.equals(backendHost)) {
                    log.error("[REDIRECT] LOOP PREVENT: /error 404 redirect target is backend itself ({}), using localhost", target);
                    target = "http://localhost:5173/";
                }
            } catch (Exception ignored) { }
            log.info("[REDIRECT] /error 404->frontend path={} redirectTarget={} frontendOriginConfig={}", path, target, frontendOrigin);
            // #endregion
            return ResponseEntity.status(HttpStatus.FOUND).location(java.net.URI.create(target)).build();
        }

        if (path.startsWith("/api") || accept.contains(MediaType.APPLICATION_JSON_VALUE)) {
            return ResponseEntity
                .status(status)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("error", "Error", "status", status, "path", path));
        }

        return ResponseEntity.status(status).body("Error " + status);
    }
}
