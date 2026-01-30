package com.jjajo.infrastructure.gemini;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.Duration;
import java.util.LinkedHashMap;
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
                            .path("/models/gemini-2.0-flash:generateContent")
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
    
    /**
     * Gemini API와 채팅 (웹 검색 기능 포함)
     */
    public String chatWithWebSearch(String userMessage, String apiKey) {
        try {
            log.debug("Gemini API 웹 검색 채팅 시작: {}", userMessage);
            
            // 웹 검색 도구를 포함한 요청 바디 구성
            Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                    Map.of(
                        "parts", List.of(
                            Map.of("text", userMessage)
                        )
                    )
                ),
                "tools", List.of(
                    Map.of("googleSearch", Map.of())
                ),
                "generationConfig", Map.of(
                    "temperature", 0.7,
                    "maxOutputTokens", 2000
                )
            );
            
            Map response = webClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/models/gemini-2.0-flash:generateContent")
                            .queryParam("key", apiKey)
                            .build())
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(Duration.ofSeconds(60)); // 웹 검색 포함이므로 타임아웃 증가
            
            if (response != null && response.containsKey("candidates")) {
                List<Map> candidates = (List<Map>) response.get("candidates");
                if (!candidates.isEmpty()) {
                    Map firstCandidate = candidates.get(0);
                    Map content = (Map) firstCandidate.get("content");
                    List<Map> parts = (List<Map>) content.get("parts");
                    
                    // 모든 텍스트 부분을 합침
                    StringBuilder fullText = new StringBuilder();
                    for (Map part : parts) {
                        if (part.containsKey("text")) {
                            fullText.append((String) part.get("text"));
                        }
                    }
                    
                    if (fullText.length() > 0) {
                        log.debug("Gemini API 웹 검색 응답 성공 (길이: {})", fullText.length());
                        return fullText.toString();
                    }
                }
            }
            
            log.warn("Gemini API 웹 검색 응답 형식 오류");
            throw new RuntimeException("AI 응답 형식 오류");
            
        } catch (Exception e) {
            log.error("Gemini API 웹 검색 채팅 실패", e);
            throw new RuntimeException("AI 웹 검색 채팅 처리 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * 자연어 한 줄 명령을 Gemini Function Calling으로 파싱하여 일정 정보 추출
     * 예: "내일 오후 3시부터 2시간 동안 팀 프로젝트 회의 추가해줘" → title, date, startTime, endTime
     */
    public com.jjajo.domain.model.ScheduleRequest parseScheduleWithFunctionCalling(String userCommand, String apiKey) {
        try {
            log.debug("매직 바 일정 파싱 시작: {}", userCommand);

            String today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
            String prompt = String.format("""
                오늘 날짜는 %s 입니다. 사용자가 아래 한 줄로 일정 추가를 요청했습니다. add_schedule 함수를 호출하여 제목, 날짜(YYYY-MM-DD), 시작시간(HH:mm), 소요시간(분)을 추출하세요.
                시간은 24시간 형식으로 넣으세요. (오후 3시 → 15:00)
                사용자 입력: %s
                """, today, userCommand);

            Map<String, Object> addScheduleParams = new LinkedHashMap<>();
            addScheduleParams.put("type", "object");
            addScheduleParams.put("properties", Map.of(
                "title", Map.of(
                    "type", "string",
                    "description", "일정 제목 (예: 팀 프로젝트 회의)"
                ),
                "date", Map.of(
                    "type", "string",
                    "description", "날짜 YYYY-MM-DD 형식. 오늘=" + today + ", 내일/모레 등은 이 날짜 기준으로 계산"
                ),
                "start_time", Map.of(
                    "type", "string",
                    "description", "시작 시간 HH:mm 24시간 형식 (예: 15:00)"
                ),
                "duration_minutes", Map.of(
                    "type", "integer",
                    "description", "소요 시간(분). 2시간이면 120, 30분이면 30"
                )
            ));
            addScheduleParams.put("required", List.of("title", "date", "start_time", "duration_minutes"));

            Map<String, Object> requestBody = new LinkedHashMap<>();
            requestBody.put("contents", List.of(
                Map.of("role", "user", "parts", List.of(Map.of("text", prompt)))
            ));
            requestBody.put("tools", List.of(
                Map.of("functionDeclarations", List.of(
                    Map.of(
                        "name", "add_schedule",
                        "description", "캘린더에 일정을 추가합니다. 사용자의 자연어에서 제목, 날짜, 시작시간, 소요시간(분)을 추출합니다.",
                        "parameters", addScheduleParams
                    )
                ))
            ));
            requestBody.put("generationConfig", Map.of(
                "temperature", 0.1,
                "maxOutputTokens", 256
            ));
            requestBody.put("toolConfig", Map.of(
                "functionCallingConfig", Map.of(
                    "mode", "ANY",
                    "allowedFunctionNames", List.of("add_schedule")
                )
            ));

            @SuppressWarnings("unchecked")
            Map<String, Object> response = webClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/models/gemini-2.0-flash:generateContent")
                            .queryParam("key", apiKey)
                            .build())
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(TIMEOUT);

            if (response == null || !response.containsKey("candidates")) {
                log.warn("매직 바 파싱: 응답에 candidates 없음");
                throw new IllegalArgumentException("일정을 파악하지 못했어요. 예: 내일 오후 3시부터 2시간 동안 팀 회의");
            }

            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates.isEmpty()) {
                throw new IllegalArgumentException("일정을 파악하지 못했어요. 날짜·시간·제목을 포함해 다시 입력해주세요.");
            }

            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            if (parts == null || parts.isEmpty()) {
                throw new IllegalArgumentException("일정을 파악하지 못했어요.");
            }

            Map<String, Object> functionCall = null;
            for (Map<String, Object> part : parts) {
                if (part.containsKey("functionCall")) {
                    functionCall = (Map<String, Object>) part.get("functionCall");
                    break;
                }
            }
            if (functionCall == null || !"add_schedule".equals(functionCall.get("name"))) {
                throw new IllegalArgumentException("일정 추가 형식을 인식하지 못했어요. 예: 내일 오후 3시부터 2시간 동안 팀 회의");
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> args = (Map<String, Object>) functionCall.get("args");
            if (args == null) {
                throw new IllegalArgumentException("일정 정보를 추출하지 못했어요.");
            }

            String title = args.get("title") != null ? args.get("title").toString().trim() : null;
            String dateStr = args.get("date") != null ? args.get("date").toString().trim() : null;
            String startTimeStr = args.get("start_time") != null ? args.get("start_time").toString().trim() : null;
            Number durationNum = args.get("duration_minutes") != null ? (Number) args.get("duration_minutes") : 60;

            if (title == null || title.isEmpty() || dateStr == null || dateStr.isEmpty() || startTimeStr == null || startTimeStr.isEmpty()) {
                throw new IllegalArgumentException("제목, 날짜, 시작 시간을 모두 포함해 주세요.");
            }

            int durationMinutes = durationNum != null ? durationNum.intValue() : 60;
            if (durationMinutes <= 0) durationMinutes = 60;

            String normalizedStart = startTimeStr.contains(":") ? startTimeStr : startTimeStr + ":00";
            if (normalizedStart.length() == 4) normalizedStart = "0" + normalizedStart;
            String startTimeParsed = normalizedStart.length() >= 5 ? normalizedStart.substring(0, 5) : (normalizedStart + ":00").substring(0, 5);
            LocalTime startTime = LocalTime.parse(startTimeParsed, DateTimeFormatter.ISO_LOCAL_TIME);
            String endTimeStr = startTime.plusMinutes(durationMinutes).format(DateTimeFormatter.ISO_LOCAL_TIME).substring(0, 5);
            String startTimeOut = startTime.format(DateTimeFormatter.ISO_LOCAL_TIME).substring(0, 5);

            log.debug("매직 바 파싱 결과: title={}, date={}, start={}, end={}", title, dateStr, startTimeOut, endTimeStr);

            return com.jjajo.domain.model.ScheduleRequest.builder()
                    .title(title)
                    .description("한 줄 명령으로 추가한 일정")
                    .date(dateStr)
                    .startTime(startTimeOut)
                    .endTime(endTimeStr)
                    .priority("medium")
                    .build();
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("매직 바 일정 파싱 실패", e);
            throw new RuntimeException("일정을 이해하지 못했어요. 예: 내일 오후 3시부터 2시간 동안 팀 프로젝트 회의", e);
        }
    }
}
