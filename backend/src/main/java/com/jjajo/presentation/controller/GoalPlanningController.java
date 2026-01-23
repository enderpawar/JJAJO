package com.jjajo.presentation.controller;

import com.jjajo.application.service.GoalQuestionGenerationService;
import com.jjajo.application.service.GoalPlanGenerationService;
import com.jjajo.presentation.dto.PlanGenerationRequest;
import com.jjajo.presentation.dto.DirectPlanRequest;
import com.jjajo.presentation.dto.PlanResponse;
import com.jjajo.presentation.dto.QuestionGenerationRequest;
import com.jjajo.presentation.dto.QuestionResponse;
import com.jjajo.presentation.dto.RoadmapOptionsRequest;
import com.jjajo.presentation.dto.RoadmapStyleResponse;
import com.jjajo.presentation.dto.WeekOptionsResponse;
import com.jjajo.presentation.dto.GoalSummaryResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * AI 목표 계획 수립 API
 */
@Slf4j
@RestController
@RequestMapping("/api/goals")
@RequiredArgsConstructor
@Tag(name = "Goal Planning", description = "AI 기반 목표 계획 수립 API")
public class GoalPlanningController {
    
    private final GoalQuestionGenerationService questionGenerationService;
    private final GoalPlanGenerationService planGenerationService;
    
    @PostMapping(value = "/generate-questions", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "AI 맞춤 질문 생성", description = "목표를 분석하여 맞춤 질문을 생성합니다")
    public Mono<List<QuestionResponse>> generateQuestions(
            @RequestBody QuestionGenerationRequest request,
            @RequestHeader(value = "X-API-Key", required = false) String apiKey
    ) {
        log.info("질문 생성 요청 수신 - 목표: {}", request.getGoalTitle());
        
        // TODO: API 키 관리 개선 필요 (현재는 임시로 환경변수 사용)
        String effectiveApiKey = apiKey != null ? apiKey : System.getenv("GEMINI_API_KEY");
        
        return Mono.fromCallable(() -> 
            questionGenerationService.generateQuestions(request, effectiveApiKey)
        );
    }
    
    @PostMapping(value = "/generate-plan", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "AI 맞춤 계획 생성", description = "질문 답변을 기반으로 ADHD 친화적 계획을 생성합니다")
    public Mono<PlanResponse> generatePlan(
            @RequestBody PlanGenerationRequest request,
            @RequestHeader(value = "X-API-Key", required = false) String apiKey
    ) {
        log.info("계획 생성 요청 수신 - 목표: {}, 마감일: {}", 
                request.getGoalTitle(), request.getDeadline());
        
        // TODO: API 키 관리 개선 필요
        String effectiveApiKey = apiKey != null ? apiKey : System.getenv("GEMINI_API_KEY");
        
        return Mono.fromCallable(() -> 
            planGenerationService.generatePlan(request, effectiveApiKey)
        );
    }
    
    @PostMapping(value = "/generate-roadmap-options", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "로드맵 스타일 옵션 생성", description = "3가지 로드맵 스타일(속성/탄탄/실전)을 생성합니다")
    public Mono<List<RoadmapStyleResponse>> generateRoadmapOptions(
            @RequestBody RoadmapOptionsRequest request,
            @RequestHeader(value = "X-API-Key", required = false) String apiKey
    ) {
        log.info("로드맵 스타일 생성 요청 수신 - 목표: {}", request.getGoalTitle());
        
        String effectiveApiKey = apiKey != null ? apiKey : System.getenv("GEMINI_API_KEY");
        
        return Mono.fromCallable(() -> 
            planGenerationService.generateRoadmapStyles(request, effectiveApiKey)
        );
    }
    
    @PostMapping(value = "/generate-goal-summary", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "목표 요약 생성", description = "질문 답변을 기반으로 목표 분석 및 추천 방향을 제시합니다")
    public Mono<GoalSummaryResponse> generateGoalSummary(
            @RequestBody RoadmapOptionsRequest request,
            @RequestHeader(value = "X-API-Key", required = false) String apiKey
    ) {
        log.info("목표 요약 생성 요청 수신 - 목표: {}", request.getGoalTitle());
        
        String effectiveApiKey = apiKey != null ? apiKey : System.getenv("GEMINI_API_KEY");
        
        return Mono.fromCallable(() -> 
            planGenerationService.generateGoalSummary(request, effectiveApiKey)
        );
    }
    
    @GetMapping(value = "/week-options", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "주차별 학습 옵션 생성", description = "특정 주차에 적합한 교재/강의 옵션을 생성합니다")
    public Mono<WeekOptionsResponse> getWeekOptions(
            @RequestParam String goalTitle,
            @RequestParam String roadmapStyle,
            @RequestParam Integer weekNumber,
            @RequestParam String weekTheme,
            @RequestHeader(value = "X-API-Key", required = false) String apiKey
    ) {
        log.info("주차별 옵션 생성 요청 수신 - 목표: {}, 주차: {}", goalTitle, weekNumber);
        
        String effectiveApiKey = apiKey != null ? apiKey : System.getenv("GEMINI_API_KEY");
        
        return Mono.fromCallable(() -> 
            planGenerationService.generateWeekOptions(
                goalTitle, roadmapStyle, weekNumber, weekTheme, effectiveApiKey
            )
        );
    }
    
    @PostMapping(value = "/generate-plan-direct", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "간소화된 AI 계획 생성", description = "질문 없이 목표만으로 즉시 계획 생성")
    public Mono<PlanResponse> generatePlanDirect(
            @RequestBody DirectPlanRequest request,
            @RequestHeader(value = "X-API-Key", required = false) String apiKey
    ) {
        log.info("간소화 계획 생성 요청 - 목표: {}, 마감일: {}", 
                request.getGoalTitle(), request.getDeadline());
        
        String effectiveApiKey = apiKey != null ? apiKey : System.getenv("GEMINI_API_KEY");
        
        return Mono.fromCallable(() -> 
            planGenerationService.generateDirectPlan(request, effectiveApiKey)
        );
    }
}
