package com.jjajo.presentation.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.Locale;

/**
 * iOS Safari: 302 리다이렉트 시 주소창만 바뀌고 문서가 갱신되지 않는 이슈 회피.
 * GET /oauth2/authorization/google 요청이 iOS 계열 User-Agent일 때만 응답을 감싸
 * sendRedirect(Google URL)를 200 + meta refresh HTML로 대체한다.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE - 10)
public class IosOAuthRedirectFixFilter extends OncePerRequestFilter {

    private static boolean isIos(HttpServletRequest request) {
        String ua = request.getHeader("User-Agent");
        if (ua == null) return false;
        String lower = ua.toLowerCase(Locale.ROOT);
        return lower.contains("iphone") || lower.contains("ipad");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        boolean getOauthGoogle = "GET".equalsIgnoreCase(request.getMethod())
            && path != null && path.equals("/oauth2/authorization/google");
        if (!getOauthGoogle || !isIos(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        OAuthRedirectResponseWrapper wrapper = new OAuthRedirectResponseWrapper(response);
        filterChain.doFilter(request, wrapper);
        if (wrapper.hasRedirectTarget()) {
            wrapper.commitMetaRefreshIfNeeded();
        }
    }
}

/**
 * sendRedirect(Google OAuth URL) 호출을 가로채 200 + meta refresh HTML로 대체.
 */
final class OAuthRedirectResponseWrapper extends HttpServletResponseWrapper {

    private static final String GOOGLE_AUTH_HOST = "accounts.google.com";

    private String redirectTarget;
    private boolean committed;

    OAuthRedirectResponseWrapper(HttpServletResponse response) {
        super(response);
    }

    @Override
    public void sendRedirect(String location) throws IOException {
        if (location != null && location.contains(GOOGLE_AUTH_HOST)) {
            redirectTarget = location;
            return;
        }
        super.sendRedirect(location);
    }

    @Override
    public void setStatus(int sc) {
        if (redirectTarget == null) {
            super.setStatus(sc);
        }
    }

    @Override
    public void sendError(int sc) throws IOException {
        if (redirectTarget == null) {
            super.sendError(sc);
        }
    }

    @Override
    public void sendError(int sc, String msg) throws IOException {
        if (redirectTarget == null) {
            super.sendError(sc, msg);
        }
    }

    @Override
    public void flushBuffer() throws IOException {
        if (redirectTarget != null && !committed) {
            commitMetaRefresh();
        }
        super.flushBuffer();
    }

    @Override
    public PrintWriter getWriter() throws IOException {
        if (redirectTarget != null && !committed) {
            commitMetaRefresh();
        }
        return super.getWriter();
    }

    private void commitMetaRefresh() throws IOException {
        if (committed || redirectTarget == null) return;
        committed = true;
        HttpServletResponse res = (HttpServletResponse) getResponse();
        res.setStatus(HttpServletResponse.SC_OK);
        res.setContentType("text/html;charset=UTF-8");
        String escaped = redirectTarget
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;");
        String html = "<!DOCTYPE html><html><head>"
            + "<meta charset=\"UTF-8\">"
            + "<meta http-equiv=\"refresh\" content=\"0;url=" + escaped + "\">"
            + "<title>Redirecting...</title></head>"
            + "<body><p>Redirecting to Google sign-in...</p></body></html>";
        res.getWriter().write(html);
        res.getWriter().flush();
    }

    boolean hasRedirectTarget() {
        return redirectTarget != null;
    }

    /** 필터에서 doFilter 반환 후 호출해 200 + meta refresh 응답을 전송한다. */
    void commitMetaRefreshIfNeeded() throws IOException {
        if (redirectTarget != null && !committed) {
            commitMetaRefresh();
        }
    }
}
