package com.jjajo.presentation.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 웹 설정 (CORS 등)
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns(
                        "http://localhost:*",          // 로컬 개발 환경
                        "https://*.pages.dev",        // Cloudflare Pages 기본 도메인
                        "https://*.*"                 // (필요 시) 커스텀 도메인 - 실제 운영 시에는 구체적인 도메인으로 제한 권장
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("Content-Type", "Authorization", "Accept", "X-Gemini-API-Key")
                .exposedHeaders("X-Gemini-API-Key")
                .allowCredentials(true);
    }
}
