package com.jjajo.infrastructure.gemini;

import com.jjajo.application.port.out.GeminiPort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.Map;

/**
 * Gemini API 어댑터 구현체
 * Google Gemini API를 직접 호출하여 API 키 유효성을 검증합니다
 */
@Slf4j
@Component
public class GeminiAdapter implements GeminiPort {
    
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";
    private static final Duration TIMEOUT = Duration.ofSeconds(10);
    
    private final WebClient webClient;
    
    public GeminiAdapter() {
        this.webClient = WebClient.builder()
                .baseUrl(GEMINI_API_URL)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }
    
    @Override
    public String testConnection(String apiKey) {
        try {
            log.debug("Gemini API 연결 테스트 시작");
            
            // Gemini API의 models.list 엔드포인트 호출하여 유효성 검증
            Map<String, Object> response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/models")
                            .queryParam("key", apiKey)
                            .build())
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(TIMEOUT);
            
            if (response != null && response.containsKey("models")) {
                log.debug("API 키 검증 성공");
                return "Gemini API 연결 성공";
            } else {
                throw new RuntimeException("예상치 못한 응답 형식");
            }
            
        } catch (WebClientResponseException e) {
            log.error("Gemini API 호출 실패 - 상태 코드: {}, 메시지: {}", 
                    e.getStatusCode(), e.getMessage());
            
            if (e.getStatusCode().value() == 400) {
                throw new RuntimeException("잘못된 API 키 형식입니다");
            } else if (e.getStatusCode().value() == 403) {
                throw new RuntimeException("API 키가 유효하지 않거나 권한이 없습니다");
            } else {
                throw new RuntimeException("Gemini API 호출 실패: " + e.getStatusCode());
            }
        } catch (Exception e) {
            log.error("예상치 못한 오류 발생", e);
            throw new RuntimeException("네트워크 오류가 발생했습니다");
        }
    }
}
