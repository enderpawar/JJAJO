package com.jjajo.infrastructure.gemini;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jjajo.presentation.dto.FixedScheduleCandidate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Gemini Vision을 사용해 시간표 이미지를 고정 일정 후보 리스트로 파싱하는 어댑터.
 */
@Slf4j
@Component
public class GeminiTimetableAdapter {

    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";
    private static final Duration TIMEOUT = Duration.ofSeconds(60);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final WebClient webClient;

    public GeminiTimetableAdapter() {
        this.webClient = WebClient.builder()
                .baseUrl(GEMINI_API_URL)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * 시간표 이미지에서 과목/요일/시간/장소를 추출한다.
     *
     * @param imageBytes   업로드된 시간표 이미지 (PNG/JPEG 등)
     * @param apiKey       Gemini API 키
     * @param languageHint 예: "ko", "en", null
     * @param weekStartDay 예: "MON", "SUN", null
     */
    public List<FixedScheduleCandidate> parseTimetable(byte[] imageBytes, String mimeType, String apiKey, String languageHint, String weekStartDay) {
        try {
            log.debug("Gemini 시간표 파싱 시작 (bytes={})", imageBytes != null ? imageBytes.length : 0);

            if (imageBytes == null || imageBytes.length == 0) {
                return Collections.emptyList();
            }

            String base64 = Base64.getEncoder().encodeToString(imageBytes);

            StringBuilder prompt = new StringBuilder();
            prompt.append("""
                    이 이미지는 사람의 주간/일정 시간표입니다.
                    다양한 형식(그리드형, 리스트형, 캘린더 앱 캡처)이 올 수 있습니다.

                    각 수업/활동 블록에 대해 다음 필드를 가진 JSON 배열을 만들어 주세요:
                    - title: 문자열, 과목/활동 이름
                    - dayOfWeek: 문자열, MON,TUE,WED,THU,FRI,SAT,SUN 중 하나
                    - startTime: 문자열, 24시간 HH:mm 형식 (예: "09:00")
                    - endTime: 문자열, 24시간 HH:mm 형식 (예: "10:15")
                    - location: 문자열 또는 빈 문자열 (강의실/장소)
                    - notes: 문자열 또는 빈 문자열 (선택 메모)
                    - source: 문자열 (예: "EVERYTIME","SCHOOL_PORTAL","ETC")

                    규칙:
                    - 요일이 한글(월~일), 영어(Mon~Sun), 한 글자(M,T,W,Th,F 등)로 쓰여 있어도 MON~SUN으로 정규화하세요.
                    - 시간이 정시/교시 등으로만 표시되면 합리적으로 HH:mm 범위로 추정하세요.
                    - JSON 외의 설명 텍스트는 절대 포함하지 마세요.
                    - 결과는 반드시 JSON 배열 하나만 포함해야 합니다.
                    """);
            if (languageHint != null && !languageHint.isBlank()) {
                prompt.append("\n추가 정보: 이 시간표의 주 언어는 ").append(languageHint).append(" 입니다.");
            }
            if (weekStartDay != null && !weekStartDay.isBlank()) {
                prompt.append("\n추가 정보: 주는 ").append(weekStartDay).append(" 요일부터 시작합니다.");
            }

            String safeMimeType = (mimeType != null && !mimeType.isBlank()) ? mimeType : "image/jpeg";

            Map<String, Object> imagePart = Map.of(
                    "inlineData", Map.of(
                            "mimeType", safeMimeType,
                            "data", base64
                    )
            );

            Map<String, Object> textPart = Map.of(
                    "text", prompt.toString()
            );

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(imagePart, textPart))
                    ),
                    "generationConfig", Map.of(
                            "temperature", 0.1,
                            "maxOutputTokens", 1024
                    )
            );

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
                log.warn("Gemini 시간표 파싱 응답에 candidates 없음");
                return Collections.emptyList();
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates.isEmpty()) {
                log.warn("Gemini 시간표 파싱: candidates 비어 있음");
                return Collections.emptyList();
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            if (content == null) {
                log.warn("Gemini 시간표 파싱: content 없음");
                return Collections.emptyList();
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            if (parts == null || parts.isEmpty()) {
                log.warn("Gemini 시간표 파싱: parts 없음");
                return Collections.emptyList();
            }

            StringBuilder textBuilder = new StringBuilder();
            for (Map<String, Object> part : parts) {
                Object t = part.get("text");
                if (t instanceof String s) {
                    textBuilder.append(s);
                }
            }

            String text = textBuilder.toString().trim();
            if (text.isEmpty()) {
                log.warn("Gemini 시간표 파싱: text 비어 있음");
                return Collections.emptyList();
            }

            // 모델이 ```json 블록으로 감쌌을 수 있으므로 제거
            if (text.startsWith("```")) {
                int firstNewline = text.indexOf('\n');
                int lastFence = text.lastIndexOf("```");
                if (firstNewline >= 0 && lastFence > firstNewline) {
                    text = text.substring(firstNewline + 1, lastFence).trim();
                }
            }

            List<FixedScheduleCandidate> result = OBJECT_MAPPER.readValue(
                    text,
                    new TypeReference<List<FixedScheduleCandidate>>() {}
            );

            log.debug("Gemini 시간표 파싱 결과 {}건", result != null ? result.size() : 0);
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.error("Gemini 시간표 파싱 실패", e);
            throw new RuntimeException("시간표 이미지를 해석하는 중 오류가 발생했습니다.", e);
        }
    }
}

