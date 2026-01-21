package com.jjajo.presentation.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Swagger/OpenAPI 문서 설정
 * 
 * 중요: OpenAPI는 API 문서화 표준입니다. (Swagger UI용)
 * 실제 AI 기능은 Google Gemini API를 사용합니다.
 * 
 * 설계 근거:
 * - API 문서 자동 생성으로 프론트엔드와의 소통 효율화
 * - Gemini API Key 인증 방식 명시
 * - 서버 정보 제공으로 개발/프로덕션 환경 구분
 * 
 * 접속 URL: http://localhost:8080/swagger-ui.html
 */
@Configuration
public class OpenApiConfig {
    
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(apiInfo())
                .servers(servers())
                .addSecurityItem(new SecurityRequirement().addList("API Key"))
                .components(new io.swagger.v3.oas.models.Components()
                        .addSecuritySchemes("API Key", apiKeySecurityScheme()));
    }
    
    /**
     * API 메타데이터
     */
    private Info apiInfo() {
        return new Info()
                .title("JJA-JO API - Gemini 기반 AI 목표 달성 플래너")
                .version("1.0.0")
                .description("""
                        ## 개요
                        JJA-JO는 **Google Gemini AI** 기반 대화형 목표 설정 및 일정 관리 플랫폼입니다.
                        
                        ## AI 엔진
                        - **사용 AI**: Google Gemini 2.0 Flash (Experimental)
                        - **기능**: 자연어 처리, 대화형 상담, 맞춤형 계획 수립
                        - **API 제공**: Google Cloud Vertex AI
                        
                        ## 주요 기능
                        1. **대화형 목표 설정**: Gemini AI와 충분한 상담을 통해 구체적인 목표 수립
                        2. **자동 일정 생성**: 사용자의 가용 시간과 선호도를 고려한 맞춤 일정
                        3. **진행 상황 추적**: 마일스톤 기반 목표 달성 모니터링
                        4. **충돌 감지**: 일정 겹침 및 과부하 방지
                        5. **AI 제안**: 생산성 향상을 위한 proactive 조언
                        
                        ## 인증 방식
                        모든 API 요청은 HTTP 헤더에 **Google Gemini API Key**가 필요합니다:
                        ```
                        X-API-Key: your-gemini-api-key
                        ```
                        
                        ### Gemini API Key 발급 방법
                        1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
                        2. "Create API Key" 클릭
                        3. 발급된 키를 안전하게 보관
                        
                        ## 기술 스택
                        - **Backend**: Spring Boot 3.4, Java 17
                        - **AI Framework**: Spring AI + Gemini
                        - **Database**: JPA + H2 (Dev) / PostgreSQL (Prod)
                        - **문서화**: Swagger/OpenAPI 3.0
                        
                        ## 문의
                        기술 지원: support@jjajo.com
                        """)
                .contact(new Contact()
                        .name("JJA-JO Development Team")
                        .email("support@jjajo.com")
                        .url("https://jjajo.com"))
                .license(new License()
                        .name("MIT License")
                        .url("https://opensource.org/licenses/MIT"));
    }
    
    /**
     * 서버 정보
     */
    private List<Server> servers() {
        return List.of(
                new Server()
                        .url("http://localhost:8080")
                        .description("로컬 개발 서버"),
                new Server()
                        .url("https://api.jjajo.com")
                        .description("프로덕션 서버")
        );
    }
    
    /**
     * Gemini API Key 보안 스키마
     */
    private SecurityScheme apiKeySecurityScheme() {
        return new SecurityScheme()
                .type(SecurityScheme.Type.APIKEY)
                .in(SecurityScheme.In.HEADER)
                .name("X-API-Key")
                .description("""
                        Google Gemini API Key를 헤더에 포함해주세요.
                        
                        발급 방법:
                        1. https://makersuite.google.com/app/apikey 접속
                        2. "Create API Key" 클릭
                        3. 생성된 키를 복사하여 이 헤더에 입력
                        
                        예시: AIzaSy...
                        """);
    }
}
