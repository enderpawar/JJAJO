package com.jjajo.presentation.controller;

import com.jjajo.application.service.DailyScheduleGenerationService;
import com.jjajo.presentation.dto.DailyScheduleRequest;
import com.jjajo.presentation.dto.DailyScheduleResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

/**
 * AI 하루 일정 생성 API
 */
@Slf4j
@RestController
@RequestMapping("/api/schedule")
@RequiredArgsConstructor
@Tag(name = "Daily Schedule", description = "AI 기반 하루 일정 생성 API")
public class DailyScheduleController {
    
    private final DailyScheduleGenerationService scheduleGenerationService;
    
    @PostMapping(value = "/generate-daily", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "AI 하루 일정 생성", description = "목표 정보를 기반으로 AI가 하루 일정을 자동으로 생성합니다")
    public Mono<DailyScheduleResponse> generateDailySchedule(@RequestBody DailyScheduleRequest request) {
        log.info("하루 일정 생성 요청 수신 - 목표: {}", request.getGoalTitle());
        return scheduleGenerationService.generateDailySchedule(request);
    }
}
