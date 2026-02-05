package com.jjajo.presentation.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import com.jjajo.presentation.config.FrontendOriginNormalizer;
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

    @Value("${app.frontend-origin:http://localhost:5173}")
    private String frontendOrigin;

    /** OAuth/404 리다이렉트 루프 디버깅: 배포 환경에서 FRONTEND_ORIGIN 값 확인 */
    @GetMapping("/frontend-origin")
    public ResponseEntity<Map<String, String>> frontendOrigin() {
        Map<String, String> body = new HashMap<>();
        body.put("frontend_origin_raw", frontendOrigin != null ? frontendOrigin : "(null)");
        body.put("frontend_origin_normalized", FrontendOriginNormalizer.toAbsoluteUrl(frontendOrigin));
        body.put("hint", "스킴 없이(예: jjajo.pages.dev) 넣어도 내부에서 https:// 로 변환됩니다. 반드시 전체 URL(https://jjajo.pages.dev)으로 넣는 것을 권장합니다.");
        return ResponseEntity.ok(body);
    }

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
