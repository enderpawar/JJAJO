package com.jjajo.presentation.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.Map;

/**
 * OAuth2 authorization 요청 시 실제 사용되는 redirect_uri 후보를 로그해
 * redirect_uri_mismatch 원인 파악용. (디버그 후 제거 가능)
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class OAuthRedirectUriLoggingFilter extends OncePerRequestFilter {

    private static final String LOG_PATH = ".cursor/debug.log";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, java.io.IOException {
        String path = request.getRequestURI();
        if (!path.startsWith("/oauth2/authorization/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String scheme = request.getScheme();
        String serverName = request.getServerName();
        int port = request.getServerPort();
        String contextPath = request.getContextPath() != null ? request.getContextPath() : "";
        String xProto = request.getHeader("X-Forwarded-Proto");
        String xHost = request.getHeader("X-Forwarded-Host");
        String xPort = request.getHeader("X-Forwarded-Port");

        // Spring이 baseUrl을 만드는 방식과 동일하게 계산 (프록시 미적용 시)
        String effectiveScheme = (xProto != null && !xProto.isEmpty()) ? xProto : scheme;
        String effectiveHost = (xHost != null && !xHost.isEmpty()) ? xHost : serverName;
        int effectivePort = (xPort != null && !xPort.isEmpty()) ? Integer.parseInt(xPort) : port;
        boolean defaultPort = ("https".equals(effectiveScheme) && effectivePort == 443)
            || ("http".equals(effectiveScheme) && effectivePort == 80);
        String portSuffix = defaultPort ? "" : (":" + effectivePort);
        String baseUrl = effectiveScheme + "://" + effectiveHost + portSuffix + contextPath;
        String redirectUri = baseUrl + "/login/oauth2/code/google";

        Map<String, Object> data = new HashMap<>();
        data.put("requestURL", request.getRequestURL().toString());
        data.put("scheme", scheme);
        data.put("serverName", serverName);
        data.put("serverPort", port);
        data.put("contextPath", contextPath);
        data.put("X-Forwarded-Proto", xProto);
        data.put("X-Forwarded-Host", xHost);
        data.put("X-Forwarded-Port", xPort);
        data.put("computedBaseUrl", baseUrl);
        data.put("computedRedirectUri", redirectUri);

        Map<String, Object> payload = new HashMap<>();
        payload.put("sessionId", "debug-session");
        payload.put("runId", "oauth-redirect");
        payload.put("hypothesisId", "H1");
        payload.put("location", "OAuthRedirectUriLoggingFilter");
        payload.put("message", "OAuth redirect_uri computed");
        payload.put("data", data);
        payload.put("timestamp", System.currentTimeMillis());

        try {
            String line = MAPPER.writeValueAsString(payload) + "\n";
            // #region agent log
            System.out.print(line);
            try {
                File cwd = new File(System.getProperty("user.dir"));
                File workspaceRoot = cwd.getName().equals("backend") ? cwd.getParentFile() : cwd;
                if (workspaceRoot != null) {
                    File workspaceLog = new File(workspaceRoot, LOG_PATH);
                    File parent = workspaceLog.getParentFile();
                    if (parent != null && !parent.exists()) parent.mkdirs();
                    Files.write(workspaceLog.toPath(), line.getBytes(StandardCharsets.UTF_8),
                        java.nio.file.StandardOpenOption.CREATE, java.nio.file.StandardOpenOption.APPEND);
                }
            } catch (Exception ignored) {
            }
            // #endregion
        } catch (Exception ignored) {
        }

        filterChain.doFilter(request, response);
    }
}
