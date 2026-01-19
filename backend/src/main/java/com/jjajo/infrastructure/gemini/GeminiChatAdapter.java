package com.jjajo.infrastructure.gemini;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Gemini API 채팅 어댑터
 */
@Slf4j
@Component
public class GeminiChatAdapter {
    
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";
    private static final Duration TIMEOUT = Duration.ofSeconds(30);
    
    private final WebClient webClient;
    
    public GeminiChatAdapter() {
        this.webClient = WebClient.builder()
                .baseUrl(GEMINI_API_URL)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }
    
    /**
     * Gemini API와 채팅
     */
    public String chat(String userMessage, String apiKey) {
        try {
            log.debug("Gemini API 채팅 시작: {}", userMessage);
            
            // 시스템 프롬프트와 사용자 메시지 구성
            String systemPrompt = """
                당신은 일정 관리를 도와주는 친절한 AI 어시스턴트입니다.
                사용자가 일정을 요청하면, 구체적인 정보를 파악하여 도움을 드립니다.
                응답은 간결하고 친근하게 해주세요.
                """;
            
            Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                    Map.of(
                        "parts", List.of(
                            Map.of("text", systemPrompt + "\n\n사용자: " + userMessage)
                        )
                    )
                ),
                "generationConfig", Map.of(
                    "temperature", 0.7,
                    "maxOutputTokens", 200
                )
            );
            
            Map response = webClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/models/gemini-2.0-flash-exp:generateContent")
                            .queryParam("key", apiKey)
                            .build())
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(TIMEOUT);
            
            if (response != null && response.containsKey("candidates")) {
                List<Map> candidates = (List<Map>) response.get("candidates");
                if (!candidates.isEmpty()) {
                    Map firstCandidate = candidates.get(0);
                    Map content = (Map) firstCandidate.get("content");
                    List<Map> parts = (List<Map>) content.get("parts");
                    if (!parts.isEmpty()) {
                        String text = (String) parts.get(0).get("text");
                        log.debug("Gemini API 응답 성공");
                        return text;
                    }
                }
            }
            
            log.warn("Gemini API 응답 형식 오류");
            return "네, 일정을 생성하겠습니다!";
            
        } catch (Exception e) {
            log.error("Gemini API 채팅 실패", e);
            throw new RuntimeException("AI 채팅 처리 중 오류가 발생했습니다", e);
        }
    }
}
