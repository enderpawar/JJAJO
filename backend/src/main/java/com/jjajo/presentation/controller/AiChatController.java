package com.jjajo.presentation.controller;

import com.jjajo.application.port.in.EditScheduleUseCase;
import com.jjajo.application.port.in.ParseScheduleUseCase;
import com.jjajo.application.port.in.PlannerScheduleUseCase;
import com.jjajo.presentation.dto.EditScheduleRequest;
import com.jjajo.presentation.dto.EditScheduleResponse;
import com.jjajo.presentation.dto.ParseScheduleRequest;
import com.jjajo.presentation.dto.PlannerScheduleRequest;
import com.jjajo.presentation.dto.PlannerScheduleResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AI 일정 관련 API 컨트롤러 (매직 바, 짜조 플래너)
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiChatController {

    private final ParseScheduleUseCase parseScheduleUseCase;
    private final EditScheduleUseCase editScheduleUseCase;
    private final PlannerScheduleUseCase plannerScheduleUseCase;

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
     * 짜조 플래너: 가용 시간대 내에서 사용자 목표를 일정으로 쪼개서 고스트 일정 제안
     * Input: userText, currentTime, date, availableSlots
     * Output: plans [{ title, start, end }]
     */
    @PostMapping("/planner-schedule")
    public ResponseEntity<PlannerScheduleResponse> plannerSchedule(
            @Valid @RequestBody PlannerScheduleRequest request,
            @RequestHeader("X-Gemini-API-Key") String apiKey) {
        log.info("짜조 플래너 요청: {}", request.getUserText());
        PlannerScheduleResponse response = plannerScheduleUseCase.planSchedule(request, apiKey);
        return ResponseEntity.ok(response);
    }
}
