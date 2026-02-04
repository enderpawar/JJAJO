package com.jjajo.presentation.controller;

import com.jjajo.application.port.in.EditScheduleUseCase;
import com.jjajo.application.port.in.ParseScheduleUseCase;
import com.jjajo.application.port.in.ProcessAiChatUseCase;
import com.jjajo.application.service.BackwardsPlanningService;
import com.jjajo.presentation.dto.AiChatRequest;
import com.jjajo.presentation.dto.AiChatResponse;
import com.jjajo.presentation.dto.EditScheduleRequest;
import com.jjajo.presentation.dto.EditScheduleResponse;
import com.jjajo.presentation.dto.ParseScheduleRequest;
import com.jjajo.presentation.dto.BackwardsPlanRequest;
import com.jjajo.presentation.dto.BackwardsPlanResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

/**
 * AI 채팅 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiChatController {

    private final ProcessAiChatUseCase processAiChatUseCase;
    private final ParseScheduleUseCase parseScheduleUseCase;
    private final EditScheduleUseCase editScheduleUseCase;
    private final BackwardsPlanningService backwardsPlanningService;

    /**
     * AI와 채팅하여 일정 정보 추출
     */
    @PostMapping("/chat")
    public ResponseEntity<AiChatResponse> chat(
            @Valid @RequestBody AiChatRequest request,
            @RequestHeader("X-Gemini-API-Key") String apiKey) {

        log.info("AI 채팅 요청 수신: {}", request.getMessage());

        AiChatResponse response = processAiChatUseCase.processMessage(request, apiKey);

        log.info("AI 채팅 응답 완료");

        return ResponseEntity.ok(response);
    }

    /**
     * 매직 바: 한 줄 자연어로 일정 파싱 (Gemini Function Calling)
     * 예: "내일 오후 3시부터 2시간 동안 팀 프로젝트 회의 추가해줘"
     */
    @PostMapping("/parse-schedule")
    public ResponseEntity<?> parseSchedule(
            @Valid @RequestBody ParseScheduleRequest request,
            @RequestHeader("X-Gemini-API-Key") String apiKey) {

        log.info("매직 바 파싱 요청: {}", request.getCommand());

        try {
            AiChatResponse.ScheduleData schedule = parseScheduleUseCase.parseSchedule(request.getCommand(), apiKey);
            return ResponseEntity.ok(schedule);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * 매직 바 대화 모드: 자연어로 일정 수정/삭제 (Gemini Function Calling)
     * 예: "공부 시간 1시간 늘리고 뒤에 있는 일정 다 취소해줘"
     */
    @PostMapping("/edit-schedule")
    public ResponseEntity<?> editSchedule(
            @Valid @RequestBody EditScheduleRequest request,
            @RequestHeader("X-Gemini-API-Key") String apiKey) {

        log.info("대화형 일정 수정 요청: {}", request.getCommand());

        try {
            EditScheduleResponse response = editScheduleUseCase.editSchedule(
                    request.getCommand(),
                    request.getTodos(),
                    apiKey);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.warn("대화형 일정 수정 실패", e);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage() != null ? e.getMessage() : "일정 수정을 처리하지 못했어요."));
        }
    }

    /**
     * 데드라인 역계산 자동 분할
     */
    @PostMapping("/backwards-plan")
    public ResponseEntity<BackwardsPlanResponse> createBackwardsPlan(
            @Valid @RequestBody BackwardsPlanRequest request,
            @RequestHeader("X-Gemini-API-Key") String apiKey) {

        // #region agent log
        agentLog("H1", "AiChatController#createBackwardsPlan", "receivedRequest",
                String.format("{\"goalTextLen\":%d,\"todosCount\":%d,\"timeSlots\":%d,\"daysOff\":%d}",
                        request.getGoalText() != null ? request.getGoalText().length() : 0,
                        request.getTodos() != null ? request.getTodos().size() : 0,
                        request.getTimeSlotPreferences() != null ? request.getTimeSlotPreferences().size() : 0,
                        request.getDaysOff() != null ? request.getDaysOff().size() : 0));
        // #endregion

        log.info("역계산 계획 생성 요청: {}", request.getGoalText());
        BackwardsPlanResponse response = backwardsPlanningService.generatePlan(request, apiKey);

        // #region agent log
        agentLog("H2", "AiChatController#createBackwardsPlan", "responseSummary",
                String.format("{\"summaryPresent\":%s,\"planDays\":%d}",
                        response.getSummary() != null,
                        response.getPlanDays() != null ? response.getPlanDays().size() : 0));
        // #endregion

        return ResponseEntity.ok(response);
    }

    // #region agent log
    private void agentLog(String hypothesisId, String location, String message, String dataJson) {
        try {
            String payload = String.format("{\"sessionId\":\"debug-session\",\"runId\":\"pre-fix\",\"hypothesisId\":\"%s\",\"location\":\"%s\",\"message\":\"%s\",\"data\":%s,\"timestamp\":%d}%n",
                    hypothesisId, location, message, dataJson, System.currentTimeMillis());
            Files.writeString(Path.of("c:\\Users\\jinwoo\\OneDrive\\바탕 화면\\프로젝트\\JJAJO\\.cursor\\debug.log"),
                    payload, StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (Exception ignored) {
        }
    }
    // #endregion
}
