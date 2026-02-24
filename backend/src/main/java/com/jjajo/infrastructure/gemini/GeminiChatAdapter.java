package com.jjajo.infrastructure.gemini;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jjajo.presentation.dto.EditOperationDto;
import com.jjajo.presentation.dto.ScheduleItemForEdit;
import com.jjajo.presentation.dto.ScheduleUpdateRequest;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

    /**
     * 자연어 명령으로 기존 일정 수정/삭제 연산 추출 (Gemini Function Calling)
     * 예: "공부 시간 1시간 늘리고 뒤에 있는 일정 다 취소해줘" → edits[]
     */
    public List<EditOperationDto> editScheduleWithFunctionCalling(String userCommand, List<ScheduleItemForEdit> todos, String apiKey) {
        try {
            log.debug("대화형 일정 수정 파싱 시작: {}", userCommand);

            String today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
            StringBuilder scheduleList = new StringBuilder();
            for (ScheduleItemForEdit t : todos) {
                scheduleList.append(String.format("  #%s id=%s title=%s date=%s startTime=%s endTime=%s%n",
                        t.getOrder() != null ? t.getOrder() : "",
                        t.getId(), t.getTitle() != null ? t.getTitle() : "",
                        t.getDate() != null ? t.getDate() : "",
                        t.getStartTime() != null ? t.getStartTime() : "",
                        t.getEndTime() != null ? t.getEndTime() : ""));
            }

            String prompt = String.format("""
                오늘 날짜는 %s 입니다.
                아래는 사용자의 현재 일정 목록입니다. 기존 일정 수정/삭제 시 반드시 이 목록에 있는 id만 사용하세요.
                - 사용자가 "첫 번째/두 번째/세 번째"처럼 말하면, 아래 목록의 #번호(순서)를 기준으로 해당 id를 찾아 사용하세요.
                일정 목록:
                %s
                사용자 명령: %s
                위 명령에 따라 apply_schedule_edits 함수를 호출하여 edits 배열을 반환하세요.
                - 새 일정을 만드는 요청(예: "5시간 공부, 10분 휴식 반복으로 짜줘", "오늘 9시부터 1시간 회의 추가")이면 operation을 "add"로 하고, title, date, start_time, end_time을 각 블록마다 넣으세요. schedule_id는 넣지 마세요. 여러 블록이면 edits에 add를 여러 개 반환하세요.
                - 기존 일정을 바꾸려면 operation "update", 지우려면 "delete"를 쓰고, schedule_id는 위 목록의 id만 사용하세요.
                - "N시간으로 줄여줘" / "N시간 늘려줘"처럼 소요시간을 바꾸는 경우: update 시 반드시 해당 일정의 기존 start_time을 그대로 넣고, end_time만 시작+소요시간으로 계산해 넣으세요. (예: 14:00~18:00 일정을 3시간으로 줄여줘 → start_time=14:00, end_time=17:00)
                - 시간은 HH:mm 24시간 형식, 날짜는 YYYY-MM-DD입니다.
                """, today, scheduleList, userCommand);

            Map<String, Object> editItemSchema = new LinkedHashMap<>();
            editItemSchema.put("type", "object");
            editItemSchema.put("properties", Map.of(
                "operation", Map.of(
                    "type", "string",
                    "description", "add(새 일정 추가) | update(기존 수정) | delete(기존 삭제)"
                ),
                "schedule_id", Map.of(
                    "type", "string",
                    "description", "기존 일정 id. update/delete일 때만 필수(위 목록의 id). add일 때는 비우거나 넣지 마세요."
                ),
                "start_time", Map.of(
                    "type", "string",
                    "description", "시작 시간 HH:mm. add일 때 필수, update일 때 선택"
                ),
                "end_time", Map.of(
                    "type", "string",
                    "description", "종료 시간 HH:mm. add일 때 필수, update일 때 선택"
                ),
                "duration_minutes", Map.of(
                    "type", "integer",
                    "description", "add에서만 사용 가능. end_time을 못 정하면 소요시간(분)으로 넣으세요. 예: 2시간=120"
                ),
                "title", Map.of(
                    "type", "string",
                    "description", "제목. add일 때 필수, update일 때 선택"
                ),
                "date", Map.of(
                    "type", "string",
                    "description", "날짜 YYYY-MM-DD. add일 때 필수, update일 때 선택"
                )
            ));
            editItemSchema.put("required", List.of("operation"));

            Map<String, Object> applyEditsParams = new LinkedHashMap<>();
            applyEditsParams.put("type", "object");
            applyEditsParams.put("properties", Map.of(
                "edits", Map.of(
                    "type", "array",
                    "description", "추가/수정/삭제 연산 목록. 새 일정 여러 개면 add를 여러 개 넣으세요.",
                    "items", editItemSchema
                )
            ));
            applyEditsParams.put("required", List.of("edits"));

            Map<String, Object> requestBody = new LinkedHashMap<>();
            requestBody.put("contents", List.of(
                Map.of("role", "user", "parts", List.of(Map.of("text", prompt)))
            ));
            requestBody.put("tools", List.of(
                Map.of("functionDeclarations", List.of(
                    Map.of(
                        "name", "apply_schedule_edits",
                        "description", "캘린더에 새 일정을 추가하거나, 기존 일정을 수정/삭제합니다. 새로 만드는 블록은 add, 기존 id를 바꾸는 것은 update/delete로 반환하세요.",
                        "parameters", applyEditsParams
                    )
                ))
            ));
            requestBody.put("generationConfig", Map.of(
                "temperature", 0.1,
                "maxOutputTokens", 2048
            ));
            requestBody.put("toolConfig", Map.of(
                "functionCallingConfig", Map.of(
                    "mode", "ANY",
                    "allowedFunctionNames", List.of("apply_schedule_edits")
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
                log.warn("대화형 수정 파싱: 응답에 candidates 없음");
                throw new IllegalArgumentException("명령을 파악하지 못했어요. 예: 공부 시간 1시간 늘리고 뒤에 있는 일정 다 취소해줘");
            }

            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates.isEmpty()) {
                throw new IllegalArgumentException("명령을 파악하지 못했어요.");
            }

            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            if (parts == null || parts.isEmpty()) {
                throw new IllegalArgumentException("명령을 파악하지 못했어요.");
            }

            Map<String, Object> functionCall = null;
            for (Map<String, Object> part : parts) {
                if (part.containsKey("functionCall")) {
                    functionCall = (Map<String, Object>) part.get("functionCall");
                    break;
                }
            }
            if (functionCall == null || !"apply_schedule_edits".equals(functionCall.get("name"))) {
                throw new IllegalArgumentException("수정 명령 형식을 인식하지 못했어요.");
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> args = (Map<String, Object>) functionCall.get("args");
            if (args == null) {
                return List.of();
            }

            List<Map<String, Object>> editsRaw = (List<Map<String, Object>>) args.get("edits");
            if (editsRaw == null || editsRaw.isEmpty()) {
                return List.of();
            }

            List<EditOperationDto> operations = new ArrayList<>();
            for (Map<String, Object> edit : editsRaw) {
                String opRaw = edit.get("op") != null ? edit.get("op").toString() : edit.get("operation") != null ? edit.get("operation").toString() : null;
                String op = (opRaw != null && !opRaw.isEmpty()) ? opRaw.trim().toLowerCase() : "update";
                String scheduleId = getString(edit, "schedule_id");

                if (EditOperationDto.TYPE_ADD.equalsIgnoreCase(op)) {
                    String title = getString(edit, "title");
                    String date = getString(edit, "date");
                    String startTime = getString(edit, "start_time");
                    String endTime = getString(edit, "end_time");
                    Integer durationMinutes = getInteger(edit, "duration_minutes");
                    // endTime 없고 duration_minutes 있으면 startTime + duration으로 계산
                    if ((endTime == null || endTime.isEmpty()) && startTime != null && !startTime.isEmpty() && durationMinutes != null && durationMinutes > 0) {
                        try {
                            String norm = startTime.contains(":") ? startTime : startTime + ":00";
                            if (norm.length() == 4) norm = "0" + norm;
                            String parsed = norm.length() >= 5 ? norm.substring(0, 5) : (norm + ":00").substring(0, 5);
                            LocalTime start = LocalTime.parse(parsed, DateTimeFormatter.ISO_LOCAL_TIME);
                            endTime = start.plusMinutes(durationMinutes).format(DateTimeFormatter.ISO_LOCAL_TIME).substring(0, 5);
                        } catch (Exception e) {
                            log.debug("duration_minutes로 endTime 계산 실패: start={}, dur={}", startTime, durationMinutes);
                        }
                    }
                    // start/end는 누락될 수 있음(프론트에서 자동 보완). title/date는 최소 필요.
                    if (title == null || date == null) continue;
                    ScheduleUpdateRequest addPayload = ScheduleUpdateRequest.builder()
                            .title(title)
                            .date(date)
                            .startTime(startTime)
                            .endTime(endTime)
                            .durationMinutes(durationMinutes)
                            .build();
                    operations.add(EditOperationDto.builder()
                            .type(EditOperationDto.TYPE_ADD)
                            .scheduleId(null)
                            .addPayload(addPayload)
                            .build());
                } else {
                    if (scheduleId == null || scheduleId.isEmpty()) continue;
                    ScheduleUpdateRequest updatePayload = null;
                    if (EditOperationDto.TYPE_UPDATE.equalsIgnoreCase(op)) {
                        updatePayload = ScheduleUpdateRequest.builder()
                                .title(getString(edit, "title"))
                                .date(getString(edit, "date"))
                                .startTime(getString(edit, "start_time"))
                                .endTime(getString(edit, "end_time"))
                                .build();
                    }
                    operations.add(EditOperationDto.builder()
                            .type(EditOperationDto.TYPE_UPDATE.equalsIgnoreCase(op) ? EditOperationDto.TYPE_UPDATE : EditOperationDto.TYPE_DELETE)
                            .scheduleId(scheduleId)
                            .updatePayload(updatePayload)
                            .build());
                }
            }

            log.debug("대화형 수정 파싱 결과: {} 건", operations.size());
            return operations;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("대화형 일정 수정 파싱 실패", e);
            throw new RuntimeException("명령을 이해하지 못했어요. 예: 공부 시간 1시간 늘리고 뒤에 있는 일정 다 취소해줘", e);
        }
    }

    private static String getString(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v != null ? v.toString().trim() : null;
    }

    private static Integer getInteger(Map<String, Object> map, String key) {
        Object v = map.get(key);
        if (v == null) return null;
        if (v instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(v.toString().trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static final ObjectMapper PLANNER_JSON = new ObjectMapper();

    private static final List<String> PLANNER_CATEGORIES = List.of("study", "workout", "work", "rest", "default");

    /**
     * 짜조 플래너: 사용자 입력에서 카테고리·일정·요약 추출.
     */
    public CategoryAndPlans detectCategoryAndPlans(String userText, String apiKey) {
        try {
            log.debug("짜조 카테고리·일정 추출: userText={}", userText);

            String systemPrompt = """
                너는 플래너 비서 '짜조'야. 사용자 입력을 분석해서 아래 JSON만 출력해. 다른 설명 없이 JSON 객체 하나만 출력해.
                {
                  "category": "study|workout|work|rest|default",
                  "summary": "오늘 반드시 할 핵심 2~3가지를 한 줄로 요약한 문장 (선택)",
                  "plans": [
                    { "title": "제목", "durationMinutes": 숫자, "breakMinutesAfter": 숫자(선택, 블록 뒤 휴식 분), "note": "세부 목표 한 줄(선택)" }
                  ]
                }
                - category: study(공부/스터디), workout(운동/헬스), work(업무/코딩/회의), rest(휴식/독서), default(기타)
                - plans: 해야 할 일정만. 쉬는시간·식사시간은 넣지 마. durationMinutes는 분 단위.
                - breakMinutesAfter: 생략 시 0. 고집중 블록 뒤에는 10~15분 권장.
                - note: 해당 블록의 구체적 목표(예: "알고리즘 3문제", "PR 1개")를 짧게.
                - 사용자가 "공부 90, 장보기 20"처럼 "제목 숫자" 형태로 입력하면, 숫자를 그대로 durationMinutes(분)로 사용해.
                  예: "공부 90, 장보기 20" → plans = [{ "title": "공부", "durationMinutes": 90 }, { "title": "장보기", "durationMinutes": 20 }]
                - 사용자가 쉼표 없이 한 문장 안에 여러 일을 말할 수도 있어.
                  예: "알고리즘 1시간 하고 그다음에 백엔드 1시간 할 거야"
                  → 최소 2개의 plan을 만들어야 해:
                    [
                      { "title": "알고리즘", "durationMinutes": 60 },
                      { "title": "백엔드", "durationMinutes": 60 }
                    ]
                  예: "알고리즘 문제 3시간 정도 하고 그다음에 백엔드 작업 3시간 할 거야"
                  → [
                      { "title": "알고리즘 문제", "durationMinutes": 180 },
                      { "title": "백엔드 작업", "durationMinutes": 180 }
                    ]
                - 문장 안에서 각 일(공부/과제/알고리즘/백엔드 작업 등)에 붙은 "N시간", "N시간 정도", "N시간 반", "N분" 표현을 찾아서,
                  해당 일의 durationMinutes를 분 단위 숫자로 계산해. 시간 표현이 여러 개면 그 개수만큼 plan을 만드는 것을 우선적으로 시도해.
                - 숫자 뒤에 "분", "시간" 등이 붙으면 적절히 분 단위로 변환해.
                """;

            Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                    Map.of(
                        "parts", List.of(
                            Map.of("text", systemPrompt + "\n\n" + userText)
                        )
                    )
                ),
                "generationConfig", Map.of(
                    "temperature", 0.2,
                    "maxOutputTokens", 1024,
                    "responseMimeType", "application/json"
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
                log.warn("짜조 플래너: 응답에 candidates 없음");
                return new CategoryAndPlans("default", List.of());
            }

            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates.isEmpty()) return new CategoryAndPlans("default", List.of());

            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            if (parts == null || parts.isEmpty()) return new CategoryAndPlans("default", List.of());

            String text = (String) parts.get(0).get("text");
            if (text == null || text.isBlank()) return new CategoryAndPlans("default", List.of());

            String json = text.trim();
            if (json.startsWith("```")) {
                int start = json.indexOf('{');
                int end = json.lastIndexOf('}') + 1;
                if (start >= 0 && end > start) json = json.substring(start, end);
            }

            JsonNode root = PLANNER_JSON.readTree(json);
            String category = root.has("category") ? root.get("category").asText().trim().toLowerCase() : "default";
            if (!PLANNER_CATEGORIES.contains(category)) {
                category = "default";
            }

            String summary = null;
            if (root.has("summary") && !root.get("summary").isNull()) {
                String s = root.get("summary").asText().trim();
                if (!s.isEmpty()) summary = s;
            }

            List<CategoryAndPlans.PlanWithDuration> plans = new ArrayList<>();
            JsonNode plansNode = root.get("plans");
            if (plansNode != null && plansNode.isArray()) {
                for (JsonNode node : plansNode) {
                    String title = node.has("title") ? node.get("title").asText().trim() : null;
                    int dur = node.has("durationMinutes") ? node.get("durationMinutes").asInt(60) : 60;
                    // 최소 10분, 최대 240분 범위로 보정
                    dur = Math.max(10, Math.min(dur, 240));
                    Integer breakAfter = node.has("breakMinutesAfter") ? Math.min(Math.max(node.get("breakMinutesAfter").asInt(0), 0), 30) : null;
                    String note = null;
                    if (node.has("note") && !node.get("note").isNull()) {
                        String n = node.get("note").asText().trim();
                        if (!n.isEmpty()) note = n;
                    }
                    String planCategory = null;
                    if (node.has("category") && !node.get("category").isNull()) {
                        String c = node.get("category").asText().trim().toLowerCase();
                        if (PLANNER_CATEGORIES.contains(c) && !"mixed".equals(c)) planCategory = c;
                        if ("coding".equals(c)) planCategory = "work";
                    }
                    if (title != null && !title.isEmpty()) {
                        plans.add(new CategoryAndPlans.PlanWithDuration(title, dur, breakAfter, note, planCategory));
                    }
                }
            }
            // 후처리 1: plans가 비었을 경우 안전한 기본 플랜 생성 (60분짜리 집중 블록 하나)
            if (plans.isEmpty()) {
                String fallbackTitle = userText != null && !userText.isBlank()
                        ? userText.strip().substring(0, Math.min(userText.strip().length(), 20))
                        : "집중 작업";
                plans.add(new CategoryAndPlans.PlanWithDuration(fallbackTitle, 60, null, null, category));
            }

            // 후처리 2: 자연어 안의 시간 표현 개수와 plans 개수 비교하여 부족하면 보완
            int timeMentionCount = 0;
            if (userText != null) {
                Pattern p = Pattern.compile("\\d+\\s*(시간|분)");
                Matcher m = p.matcher(userText);
                while (m.find()) {
                    timeMentionCount++;
                }
            }
            if (timeMentionCount > plans.size() && !plans.isEmpty()) {
                CategoryAndPlans.PlanWithDuration base = plans.get(plans.size() - 1);
                while (plans.size() < timeMentionCount) {
                    plans.add(new CategoryAndPlans.PlanWithDuration(
                            base.title(),
                            base.durationMinutes(),
                            base.breakMinutesAfter(),
                            base.note(),
                            base.category()
                    ));
                }
            }
            log.debug("짜조 카테고리={}, plans={}건, summary={}", category, plans.size(), summary != null);
            return new CategoryAndPlans(category, plans, summary);
        } catch (Exception e) {
            log.error("짜조 플래너 처리 실패", e);
            throw new RuntimeException("일정을 생성하지 못했어요. 가용 시간과 목표를 확인해 주세요.", e);
        }
    }

    public record CategoryAndPlans(String category, List<PlanWithDuration> plans, String summary) {
        public CategoryAndPlans(String category, List<PlanWithDuration> plans) {
            this(category, plans, null);
        }
        public record PlanWithDuration(String title, int durationMinutes, Integer breakMinutesAfter, String note, String category) {
            public PlanWithDuration(String title, int durationMinutes) {
                this(title, durationMinutes, null, null, null);
            }
            public PlanWithDuration(String title, int durationMinutes, Integer breakMinutesAfter, String note) {
                this(title, durationMinutes, breakMinutesAfter, note, null);
            }
        }
    }
}
