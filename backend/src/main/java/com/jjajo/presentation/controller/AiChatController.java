package com.jjajo.presentation.controller;

import com.jjajo.application.port.in.ParseScheduleUseCase;
import com.jjajo.application.port.in.ProcessAiChatUseCase;
import com.jjajo.presentation.dto.AiChatRequest;
import com.jjajo.presentation.dto.AiChatResponse;
import com.jjajo.presentation.dto.ParseScheduleRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

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
}
