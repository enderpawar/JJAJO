package com.jjajo.presentation.controller;

import com.jjajo.application.service.GoalPlanningService;
import com.jjajo.presentation.dto.GoalCreationRequest;
import com.jjajo.presentation.dto.GoalCreationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 목표 관리 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/goals")
@RequiredArgsConstructor
public class GoalController {
    
    private final GoalPlanningService goalPlanningService;
    
    /**
     * AI를 활용한 목표 생성 및 계획 수립
     */
    @PostMapping("/create-with-ai")
    public ResponseEntity<GoalCreationResponse> createGoalWithAI(
            @RequestBody GoalCreationRequest request,
            @RequestHeader("X-Gemini-API-Key") String apiKey) {
        
        log.info("AI 기반 목표 생성 요청: {}", request.getGoalDescription());
        
        try {
            GoalPlanningService.PlanningResult result = goalPlanningService.createGoalPlan(
                request.getGoalDescription(),
                apiKey
            );
            
            GoalCreationResponse response = GoalCreationResponse.builder()
                    .goal(result.getGoal())
                    .schedules(result.getSchedules())
                    .aiAnalysis(result.getAiAnalysis())
                    .totalHours(result.getTotalHours())
                    .sessionsPerWeek(result.getDaysPerWeek())
                    .curriculum(result.getCurriculum())
                    .build();
            
            log.info("목표 생성 완료: {} (일정 {}개)", result.getGoal().getTitle(), result.getSchedules().size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("목표 생성 실패", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
