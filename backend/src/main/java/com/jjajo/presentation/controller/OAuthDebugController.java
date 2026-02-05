package com.jjajo.presentation.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;

/**
 * redirect_uri_mismatch 디버깅용. 배포 환경에서 이 URL을 열면
 * Google에 등록해야 할 redirect_uri 후보를 확인할 수 있음.
 */
@RestController
@RequestMapping("/debug")
public class OAuthDebugController {

    @GetMapping("/oauth-redirect-uri")
    public ResponseEntity<Map<String, String>> oauthRedirectUri(HttpServletRequest request) {
        String scheme = request.getScheme();
        String serverName = request.getServerName();
        int port = request.getServerPort();
        String contextPath = request.getContextPath() != null ? request.getContextPath() : "";
        String xProto = request.getHeader("X-Forwarded-Proto");
        String xHost = request.getHeader("X-Forwarded-Host");
        String xPort = request.getHeader("X-Forwarded-Port");

        String effectiveScheme = (xProto != null && !xProto.isEmpty()) ? xProto : scheme;
        String effectiveHost = (xHost != null && !xHost.isEmpty()) ? xHost : serverName;
        int effectivePort = (xPort != null && !xPort.isEmpty()) ? Integer.parseInt(xPort) : port;
        boolean defaultPort = ("https".equals(effectiveScheme) && effectivePort == 443)
            || ("http".equals(effectiveScheme) && effectivePort == 80);
        String portSuffix = defaultPort ? "" : (":" + effectivePort);
        String baseUrl = effectiveScheme + "://" + effectiveHost + portSuffix + contextPath;
        String redirectUri = baseUrl + "/login/oauth2/code/google";

        Map<String, String> body = new HashMap<>();
        body.put("redirect_uri", redirectUri);
        body.put("baseUrl", baseUrl);
        body.put("hint", "Google Cloud Console > 사용자 인증 정보 > 승인된 리디렉션 URI 에 위 redirect_uri 를 정확히 추가하세요.");
        return ResponseEntity.ok(body);
    }
}
