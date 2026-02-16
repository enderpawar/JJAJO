package com.jjajo.presentation.config;

import org.springframework.boot.web.servlet.server.CookieSameSiteSupplier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * 프로덕션에서 크로스 사이트 추적 방지(iOS Safari 등)가 켜져 있어도
 * 프론트(jjajo.pages.dev) → 백엔드(onrender.com) 요청 시 세션 쿠키가 전달되도록
 * JSESSIONID에 SameSite=None을 명시적으로 적용한다.
 * application-prod.yml의 server.servlet.session.cookie와 함께 사용하며,
 * Bean으로 한 번 더 보장한다.
 */
@Configuration
@Profile("prod")
public class SessionCookieConfig {

    @Bean
    public CookieSameSiteSupplier sessionCookieSameSiteSupplier() {
        return CookieSameSiteSupplier.ofNone().whenHasName("JSESSIONID");
    }
}
