package com.jjajo.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jjajo.presentation.dto.DailyScheduleRequest;
import com.jjajo.presentation.dto.DailyScheduleResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;

/**
 * AI 기반 하루 일정 자동 생성 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DailyScheduleGenerationService {
    
    private final ObjectMapper objectMapper;
    
    /**
     * 목표 기반 하루 일정 생성
     */
    public Mono<DailyScheduleResponse> generateDailySchedule(DailyScheduleRequest request) {
        log.info("하루 일정 생성 시작 - 목표: {}, 날짜: {}", request.getGoalTitle(), request.getTargetDate());
        
        // TODO: 실제 AI 호출 (현재는 더미 응답)
        return Mono.just(generateDummySchedule(request));
    }
    
    /**
     * 더미 일정 생성 (테스트용)
     */
    private DailyScheduleResponse generateDummySchedule(DailyScheduleRequest request) {
        List<DailyScheduleResponse.ScheduleItem> scheduleItems = new ArrayList<>();
        
        // 작업 블록 1
        scheduleItems.add(DailyScheduleResponse.ScheduleItem.builder()
            .startTime("09:00")
            .endTime("10:30")
            .title(request.getGoalTitle() + " (1/4)")
            .description("첫 번째 작업 블록")
            .type("work")
            .priority(request.getPriority())
            .energyLevel("high")
            .build());
        
        // 휴식 1
        scheduleItems.add(DailyScheduleResponse.ScheduleItem.builder()
            .startTime("10:30")
            .endTime("10:45")
            .title("휴식")
            .description("스트레칭 및 워터 브레이크")
            .type("break")
            .priority("medium")
            .energyLevel("medium")
            .build());
        
        // 작업 블록 2
        scheduleItems.add(DailyScheduleResponse.ScheduleItem.builder()
            .startTime("11:00")
            .endTime("12:30")
            .title(request.getGoalTitle() + " (2/4)")
            .description("두 번째 작업 블록")
            .type("work")
            .priority(request.getPriority())
            .energyLevel("high")
            .build());
        
        // 점심
        scheduleItems.add(DailyScheduleResponse.ScheduleItem.builder()
            .startTime("12:30")
            .endTime("13:30")
            .title("점심 시간")
            .description("식사 및 휴식")
            .type("meal")
            .priority("medium")
            .energyLevel("low")
            .build());
        
        // 작업 블록 3
        scheduleItems.add(DailyScheduleResponse.ScheduleItem.builder()
            .startTime("14:00")
            .endTime("15:30")
            .title(request.getGoalTitle() + " (3/4)")
            .description("세 번째 작업 블록")
            .type("work")
            .priority(request.getPriority())
            .energyLevel("medium")
            .build());
        
        // 휴식 2
        scheduleItems.add(DailyScheduleResponse.ScheduleItem.builder()
            .startTime("15:30")
            .endTime("15:45")
            .title("휴식")
            .description("커피 브레이크")
            .type("break")
            .priority("medium")
            .energyLevel("medium")
            .build());
        
        // 작업 블록 4
        scheduleItems.add(DailyScheduleResponse.ScheduleItem.builder()
            .startTime("16:00")
            .endTime("17:30")
            .title(request.getGoalTitle() + " (4/4)")
            .description("마지막 작업 블록")
            .type("work")
            .priority(request.getPriority())
            .energyLevel("medium")
            .build());
        
        DailyScheduleResponse.Summary summary = DailyScheduleResponse.Summary.builder()
            .totalWorkBlocks(4)
            .totalBreaks(2)
            .bufferTime("1.5시간")
            .completionProbability("85%")
            .build();
        
        log.info("✅ 더미 일정 생성 완료 - {} 개 블록", scheduleItems.size());
        
        return DailyScheduleResponse.builder()
            .schedule(scheduleItems)
            .summary(summary)
            .conflicts(new ArrayList<>())
            .build();
    }
    
}
