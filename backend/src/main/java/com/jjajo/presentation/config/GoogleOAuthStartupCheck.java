package com.jjajo.presentation.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Google OAuth 설정이 적용되었는지 시작 시 한 번 확인하고 로그로 안내
 */
@Slf4j
@Component
public class GoogleOAuthStartupCheck {

    @Value("${spring.security.oauth2.client.registration.google.client-id:}")
    private String clientId;

    @EventListener(ApplicationReadyEvent.class)
    public void checkGoogleOAuthConfig() {
        if (clientId == null || clientId.isBlank() || "change-me".equals(clientId)) {
            log.error("========================================");
            log.error("Google OAuth 미설정: 401 invalid_client 발생합니다.");
            log.error("환경 변수 GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET 을 설정하세요.");
            log.error("설정 방법: backend/GOOGLE_OAUTH_SETUP.md 참고");
            log.error("========================================");
        } else {
            log.info("Google OAuth 클라이언트 ID가 설정됨 (끝 4자리: ...{})",
                    clientId.length() > 4 ? clientId.substring(clientId.length() - 4) : "****");
        }
    }
}
