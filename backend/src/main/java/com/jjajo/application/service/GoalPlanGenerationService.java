package com.jjajo.application.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jjajo.infrastructure.gemini.GeminiChatAdapter;
import com.jjajo.presentation.dto.PlanGenerationRequest;
import com.jjajo.presentation.dto.DirectPlanRequest;
import com.jjajo.presentation.dto.PlanResponse;
import com.jjajo.presentation.dto.RoadmapOptionsRequest;
import com.jjajo.presentation.dto.RoadmapStyleResponse;
import com.jjajo.presentation.dto.WeekOptionsResponse;
import com.jjajo.presentation.dto.GoalSummaryResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 목표 기반 계획 생성 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GoalPlanGenerationService {
    
    private final GeminiChatAdapter geminiChatAdapter;
    private final ObjectMapper objectMapper;
    private final LearningResourceService learningResourceService;
    
    /**
     * 간소화된 AI 계획 생성 (질문 없이 바로 생성)
     */
    public PlanResponse generateDirectPlan(DirectPlanRequest request, String apiKey) {
        log.info("간소화 계획 생성 시작 - 목표: {}, 마감일: {}", 
                request.getGoalTitle(), request.getDeadline());
        
        String prompt = buildDirectPlanPrompt(request);
        
        try {
            // Gemini에 웹 검색 기반 계획 생성 요청
            String aiResponse = geminiChatAdapter.chatWithWebSearch(prompt, apiKey);
            log.debug("AI 간소화 계획 응답 수신 (길이: {})", aiResponse.length());
            
            // JSON 파싱
            PlanResponse plan = parseDirectPlanFromAI(aiResponse, request);
            
            log.info("간소화 계획 생성 완료 - 마일스톤: {}, 일정: {}", 
                    plan.getMilestones().size(), plan.getSchedules().size());
            return plan;
            
        } catch (Exception e) {
            log.error("간소화 계획 생성 실패", e);
            // 실패 시 기본 계획 반환
            return getDefaultDirectPlan(request);
        }
    }
    
    /**
     * AI를 활용한 맞춤 계획 생성 (질문 답변 기반)
     */
    public PlanResponse generatePlan(PlanGenerationRequest request, String apiKey) {
        log.info("계획 생성 시작 - 목표: {}, 마감일: {}", 
                request.getGoalTitle(), request.getDeadline());
        
        String prompt = buildPlanPrompt(request);
        
        try {
            // Gemini에 웹 검색 기반 계획 생성 요청
            String aiResponse = geminiChatAdapter.chatWithWebSearch(prompt, apiKey);
            log.debug("AI 계획 응답 수신 (길이: {})", aiResponse.length());
            
            // JSON 파싱
            PlanResponse plan = parsePlanFromAI(aiResponse, request);
            
            log.info("계획 생성 완료 - 마일스톤: {}, 일정: {}", 
                    plan.getMilestones().size(), plan.getSchedules().size());
            return plan;
            
        } catch (Exception e) {
            log.error("계획 생성 실패", e);
            // 실패 시 기본 계획 반환
            return getDefaultPlan(request);
        }
    }
    
    /**
     * 계획 생성 프롬프트 구성
     */
    private String buildPlanPrompt(PlanGenerationRequest request) {
        long daysUntilDeadline = ChronoUnit.DAYS.between(LocalDate.now(), request.getDeadline());
        long weeks = daysUntilDeadline / 7;
        
        // 답변 정보 포맷팅
        StringBuilder answersText = new StringBuilder();
        if (request.getAnswers() != null) {
            request.getAnswers().forEach((key, value) -> 
                answersText.append(String.format("- %s: %s\n", key, value))
            );
        }
        
        String description = request.getGoalDescription() != null ? 
            request.getGoalDescription() : "설명 없음";
        
        return String.format("""
            당신은 ADHD 환자를 위한 맞춤형 학습 계획 전문가입니다.
            
            목표 정보:
            - 제목: %s
            - 설명: %s
            - 마감일: %s (약 %d주 후)
            
            사용자 답변:
            %s
            
            웹에서 최신 학습 전략, 커리큘럼, 베스트 프랙티스를 검색하여, 다음 원칙에 따라 상세 계획을 수립하세요:
            
            ADHD 친화적 원칙:
            1. 작은 단위로 쪼개기 (한 세션 최대 90분)
            2. 명확한 마일스톤 (주간 단위 목표, %d개 추천)
            3. 즉각적 보상 시스템 설계
            4. 유연성 확보 (버퍼 시간 20%%)
            5. 에너지 관리 (피크 타임 활용)
            6. 규칙적인 휴식 (포모도로 기법 등)
            
            차별화 요소:
            - 웹 검색으로 최신 정보 반영 (예: 최신 교재, 온라인 강의, 학습법)
            - 사용자 답변 기반 완전 맞춤 (시간대, 능력, 선호도)
            - ADHD 특성 고려한 난이도 조절
            
            *** 중요: 반드시 웹 검색으로 실제 자료의 직접 링크를 찾으세요 ***
            
            URL 형식 예시 (올바른 형식):
            ✅ https://www.kyobobook.co.kr/product/detailViewKor.laf?ejkGb=KOR&mallGb=KOR&barcode=9791169210560
            ✅ https://www.inflearn.com/course/스프링-입문-스프링부트
            ✅ https://www.youtube.com/watch?v=dQw4w9WgXcQ
            ✅ https://www.youtube.com/playlist?list=PLVsNizTWUw7E2KrfnsyEjTqo
            
            URL 형식 예시 (잘못된 형식 - 절대 사용 금지):
            ❌ https://www.youtube.com/results?search_query=...
            ❌ https://www.kyobobook.co.kr/search?keyword=...
            ❌ https://www.inflearn.com/courses?s=...
            
            각 일정마다 최소 2-3개의 실제 자료를 resources 배열에 포함하세요.
            
            다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
            {
              "milestones": [
                {
                  "title": "Week 1: 기초 학습",
                  "description": "구체적인 목표",
                  "learningStage": "기초|기본|심화",
                  "keyTopics": ["주제1", "주제2", "주제3"],
                  "targetDate": "yyyy-MM-dd",
                  "estimatedHours": 숫자,
                  "orderIndex": 순서
                }
              ],
              "schedules": [
                {
                  "date": "yyyy-MM-dd",
                  "startTime": "HH:mm",
                  "endTime": "HH:mm",
                  "title": "일정 제목",
                  "description": "구체적인 학습 내용 설명",
                  "resources": [
                    {
                      "type": "book|course|video|article",
                      "title": "자료 제목",
                      "url": "실제 URL (필수)",
                      "description": "자료 설명",
                      "platform": "플랫폼명 (예: 유튜브, 교보문고, 인프런)"
                    }
                  ],
                  "type": "work|break|review",
                  "priority": "high|medium|low",
                  "energyLevel": "high|medium|low"
                }
              ],
              "strategy": "ADHD 맞춤 전략에 대한 2-3 문장 설명",
              "differentiator": "이 계획만의 차별점 2-3 문장 설명 (웹 검색 결과 언급)"
            }
            
            주의사항:
            - schedules는 첫 1주일치만 생성 (7-10개 일정)
            - milestones는 학습 단계별로 구성 (기초 → 기본 → 심화)
            - 각 schedule의 resources는 반드시 웹 검색으로 찾은 실제 자료 포함
            - URL은 실제 접근 가능한 링크여야 함
            """, 
            request.getGoalTitle(),
            description,
            request.getDeadline(),
            Math.max(weeks, 1),
            answersText.toString(),
            Math.max(weeks, 1)
        );
    }
    
    /**
     * AI 응답에서 계획 파싱
     */
    private PlanResponse parsePlanFromAI(String aiResponse, PlanGenerationRequest request) {
        try {
            // JSON 부분 추출
            String jsonPart = extractJSON(aiResponse);
            
            // JSON 파싱
            Map<String, Object> planMap = objectMapper.readValue(
                jsonPart, 
                new TypeReference<Map<String, Object>>() {}
            );
            
            // Milestones 파싱
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> milestoneMaps = 
                (List<Map<String, Object>>) planMap.getOrDefault("milestones", List.of());
            
            List<PlanResponse.MilestoneDto> milestones = new ArrayList<>();
            for (Map<String, Object> mMap : milestoneMaps) {
                @SuppressWarnings("unchecked")
                List<String> keyTopics = (List<String>) mMap.getOrDefault("keyTopics", List.of());
                
                PlanResponse.MilestoneDto milestone = PlanResponse.MilestoneDto.builder()
                    .title((String) mMap.get("title"))
                    .description((String) mMap.get("description"))
                    .targetDate(LocalDate.parse((String) mMap.get("targetDate")))
                    .estimatedHours(((Number) mMap.get("estimatedHours")).intValue())
                    .orderIndex(((Number) mMap.get("orderIndex")).intValue())
                    .learningStage((String) mMap.get("learningStage"))
                    .keyTopics(keyTopics)
                    .build();
                milestones.add(milestone);
            }
            
            // Schedules 파싱
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> scheduleMaps = 
                (List<Map<String, Object>>) planMap.getOrDefault("schedules", List.of());
            
            List<PlanResponse.ScheduleRecommendation> schedules = new ArrayList<>();
            for (Map<String, Object> sMap : scheduleMaps) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> resourceMaps = 
                    (List<Map<String, Object>>) sMap.getOrDefault("resources", List.of());
                List<PlanResponse.LearningResource> resources = parseResources(resourceMaps);
                
                PlanResponse.ScheduleRecommendation schedule = PlanResponse.ScheduleRecommendation.builder()
                    .date((String) sMap.get("date"))
                    .startTime((String) sMap.get("startTime"))
                    .endTime((String) sMap.get("endTime"))
                    .title((String) sMap.get("title"))
                    .description((String) sMap.get("description"))
                    .type((String) sMap.get("type"))
                    .priority((String) sMap.get("priority"))
                    .energyLevel((String) sMap.get("energyLevel"))
                    .resources(resources)
                    .build();
                schedules.add(schedule);
            }
            
            return PlanResponse.builder()
                .milestones(milestones)
                .schedules(schedules)
                .strategy((String) planMap.get("strategy"))
                .differentiator((String) planMap.get("differentiator"))
                .build();
            
        } catch (Exception e) {
            log.error("AI 계획 응답 파싱 실패", e);
            throw new RuntimeException("계획 파싱 실패", e);
        }
    }
    
    /**
     * AI 응답에서 JSON 부분만 추출
     */
    private String extractJSON(String aiResponse) {
        String cleaned = aiResponse.trim();
        
        // 코드 블록 제거
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        
        cleaned = cleaned.trim();
        
        // JSON 객체 찾기
        int objectStart = cleaned.indexOf('{');
        int objectEnd = cleaned.lastIndexOf('}');
        
        if (objectStart >= 0 && objectEnd > objectStart) {
            return cleaned.substring(objectStart, objectEnd + 1);
        }
        
        return cleaned;
    }
    
    /**
     * 학습 자료 리스트 파싱
     */
    private List<PlanResponse.LearningResource> parseResources(List<Map<String, Object>> resourceMaps) {
        List<PlanResponse.LearningResource> resources = new ArrayList<>();
        
        for (Map<String, Object> rMap : resourceMaps) {
            PlanResponse.LearningResource resource = PlanResponse.LearningResource.builder()
                .type((String) rMap.get("type"))
                .title((String) rMap.get("title"))
                .url((String) rMap.get("url"))
                .description((String) rMap.get("description"))
                .platform((String) rMap.get("platform"))
                .build();
            resources.add(resource);
        }
        
        return resources;
    }
    
    /**
     * 간소화 계획 생성 프롬프트 구성
     */
    private String buildDirectPlanPrompt(DirectPlanRequest request) {
        long daysUntilDeadline = ChronoUnit.DAYS.between(LocalDate.now(), request.getDeadline());
        long weeks = Math.max(1, daysUntilDeadline / 7);
        
        String description = request.getGoalDescription() != null ? 
            request.getGoalDescription() : "설명 없음";
        
        return String.format("""
            당신은 ADHD 환자를 위한 전문 학습 컨설턴트입니다.
            
            목표: %s
            설명: %s
            마감일: %s (약 %d주 후)
            
            이 목표를 달성하기 위한 상세한 ADHD 친화적 학습 계획을 웹 검색을 통해 생성해주세요.
            
            ADHD 친화적 학습 원칙:
            1. 짧은 학습 세션 (25-30분 포모도로)
            2. 명확한 목표와 즉각적 피드백
            3. 시각적 진행도 추적
            4. 규칙적인 휴식 시간 (5-10분)
            5. 에너지 수준 고려 (오전: 고강도, 오후: 중강도)
            
            생성해야 할 내용:
            
            1. 주차별 마일스톤 (%d개):
               - title: "Week N: 구체적 주차 목표"
               - description: 상세 설명
               - targetDate: ISO 날짜 (오늘부터 주차별 간격)
               - estimatedHours: 주당 학습 시간
               - orderIndex: 순서
               - learningStage: "기초"|"기본"|"심화"
               - keyTopics: [핵심 주제 3개]
            
            2. 첫 주 일일 스케줄 (7일 x 2-3 세션):
               - date: ISO 날짜
               - startTime, endTime: "HH:MM" 형식
               - title: 구체적 학습 내용
               - description: 상세 설명
               - type: "work"|"break"|"review"
               - priority: "high"|"medium"|"low"
               - energyLevel: "high"|"medium"|"low"
               - resources: [
                   {
                     "type": "book"|"course"|"video",
                     "title": "자료 제목",
                     "url": "검색 페이지 URL",
                     "description": "자료 설명",
                     "platform": "플랫폼명"
                   }
                 ]
            
            3. strategy: 전체 학습 전략 (2-3문장)
            4. differentiator: ADHD 친화적 특징 (2-3문장)
            
            각 일일 스케줄의 resources에는 교보문고, 인프런, 유튜브 검색 링크를 포함하세요.
            URL은 검색 결과 페이지로 연결 (예: https://product.kyobobook.co.kr/category/...?searchWord=토익)
            
            JSON 형식:
            {
              "milestones": [...],
              "schedules": [...],
              "strategy": "전략",
              "differentiator": "차별화 요소"
            }
            
            주의: JSON만 반환하세요.
            """, 
            request.getGoalTitle(),
            description,
            request.getDeadline().toString(),
            weeks,
            weeks
        );
    }
    
    /**
     * AI 응답에서 간소화 계획 파싱
     */
    private PlanResponse parseDirectPlanFromAI(String aiResponse, DirectPlanRequest request) {
        try {
            String jsonPart = extractJSON(aiResponse);
            
            Map<String, Object> planMap = objectMapper.readValue(
                jsonPart, 
                new TypeReference<Map<String, Object>>() {}
            );
            
            // Milestones 파싱
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> milestoneMaps = 
                (List<Map<String, Object>>) planMap.getOrDefault("milestones", List.of());
            
            List<PlanResponse.MilestoneDto> milestones = new ArrayList<>();
            for (Map<String, Object> mMap : milestoneMaps) {
                @SuppressWarnings("unchecked")
                List<String> keyTopics = (List<String>) mMap.getOrDefault("keyTopics", List.of());
                
                PlanResponse.MilestoneDto milestone = PlanResponse.MilestoneDto.builder()
                    .title((String) mMap.get("title"))
                    .description((String) mMap.get("description"))
                    .targetDate(LocalDate.parse((String) mMap.get("targetDate")))
                    .estimatedHours(((Number) mMap.get("estimatedHours")).intValue())
                    .orderIndex(((Number) mMap.get("orderIndex")).intValue())
                    .learningStage((String) mMap.get("learningStage"))
                    .keyTopics(keyTopics)
                    .build();
                milestones.add(milestone);
            }
            
            // Schedules 파싱
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> scheduleMaps = 
                (List<Map<String, Object>>) planMap.getOrDefault("schedules", List.of());
            
            List<PlanResponse.ScheduleRecommendation> schedules = new ArrayList<>();
            for (Map<String, Object> sMap : scheduleMaps) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> resourceMaps = 
                    (List<Map<String, Object>>) sMap.getOrDefault("resources", List.of());
                List<PlanResponse.LearningResource> resources = parseResources(resourceMaps);
                
                PlanResponse.ScheduleRecommendation schedule = PlanResponse.ScheduleRecommendation.builder()
                    .date((String) sMap.get("date"))
                    .startTime((String) sMap.get("startTime"))
                    .endTime((String) sMap.get("endTime"))
                    .title((String) sMap.get("title"))
                    .description((String) sMap.get("description"))
                    .type((String) sMap.get("type"))
                    .priority((String) sMap.get("priority"))
                    .energyLevel((String) sMap.get("energyLevel"))
                    .resources(resources)
                    .build();
                schedules.add(schedule);
            }
            
            return PlanResponse.builder()
                .milestones(milestones)
                .schedules(schedules)
                .strategy((String) planMap.get("strategy"))
                .differentiator((String) planMap.get("differentiator"))
                .build();
            
        } catch (Exception e) {
            log.error("AI 간소화 계획 응답 파싱 실패", e);
            throw new RuntimeException("간소화 계획 파싱 실패", e);
        }
    }
    
    /**
     * 기본 간소화 계획 (AI 실패 시)
     */
    private PlanResponse getDefaultDirectPlan(DirectPlanRequest request) {
        LocalDate today = LocalDate.now();
        LocalDate deadline = request.getDeadline();
        long weeks = Math.max(1, ChronoUnit.WEEKS.between(today, deadline));
        
        // 목표에서 키워드 추출
        String goalKeyword = extractKeywordFromGoal(request.getGoalTitle());
        
        List<PlanResponse.MilestoneDto> milestones = new ArrayList<>();
        for (int i = 1; i <= Math.min(weeks, 8); i++) {
            String stage = i <= 2 ? "기초" : i <= 5 ? "기본" : "심화";
            milestones.add(PlanResponse.MilestoneDto.builder()
                .title(String.format("Week %d: %s %s", i, goalKeyword, stage))
                .description(String.format("%d주차 학습 목표", i))
                .targetDate(today.plusWeeks(i))
                .estimatedHours(10)
                .orderIndex(i)
                .learningStage(stage)
                .keyTopics(List.of("주제 1", "주제 2", "주제 3"))
                .build());
        }
        
        List<PlanResponse.ScheduleRecommendation> schedules = new ArrayList<>();
        for (int day = 0; day < 7; day++) {
            LocalDate scheduleDate = today.plusDays(day);
            String dateStr = scheduleDate.format(DateTimeFormatter.ISO_DATE);
            
            // 오전 학습 세션
            schedules.add(PlanResponse.ScheduleRecommendation.builder()
                .date(dateStr)
                .startTime("09:00")
                .endTime("09:30")
                .title(request.getGoalTitle() + " 학습")
                .description("오전 집중 학습 세션")
                .type("work")
                .priority("high")
                .energyLevel("high")
                .resources(buildDefaultResources(goalKeyword))
                .build());
            
            // 휴식
            schedules.add(PlanResponse.ScheduleRecommendation.builder()
                .date(dateStr)
                .startTime("09:30")
                .endTime("09:40")
                .title("휴식")
                .description("스트레칭 및 휴식")
                .type("break")
                .priority("medium")
                .energyLevel("low")
                .build());
            
            // 오후 복습 세션
            if (day % 2 == 0) {
                schedules.add(PlanResponse.ScheduleRecommendation.builder()
                    .date(dateStr)
                    .startTime("14:00")
                    .endTime("14:30")
                    .title(request.getGoalTitle() + " 복습")
                    .description("오전 학습 내용 복습")
                    .type("review")
                    .priority("medium")
                    .energyLevel("medium")
                    .build());
            }
        }
        
        return PlanResponse.builder()
            .milestones(milestones)
            .schedules(schedules)
            .strategy("ADHD 특성을 고려한 짧은 세션(25-30분)과 규칙적인 휴식으로 구성된 계획입니다. 포모도로 기법을 활용하여 집중력을 유지합니다.")
            .differentiator("에너지 수준에 맞춘 시간대 배치와 즉각적인 성취감을 제공하는 단계별 학습으로 지속 가능한 학습을 지원합니다.")
            .build();
    }
    
    /**
     * 목표에서 핵심 키워드 추출
     */
    private String extractKeywordFromGoal(String goalTitle) {
        // 간단한 키워드 추출 (숫자, "달성", "하기" 등 제거)
        return goalTitle
            .replaceAll("\\d+점", "")
            .replaceAll("달성하기", "")
            .replaceAll("하기", "")
            .trim()
            .split(" ")[0];
    }
    
    /**
     * 기본 학습 자료 생성
     */
    private List<PlanResponse.LearningResource> buildDefaultResources(String keyword) {
        List<PlanResponse.LearningResource> resources = new ArrayList<>();
        
        try {
            String encodedKeyword = java.net.URLEncoder.encode(keyword, java.nio.charset.StandardCharsets.UTF_8);
            
            resources.add(PlanResponse.LearningResource.builder()
                .type("book")
                .title(keyword + " 교재 검색")
                .url("https://product.kyobobook.co.kr/category/KOR/010101?page=1&sortColumn=SALES_QUANTITY&searchWord=" + encodedKeyword)
                .description("교보문고에서 베스트셀러 교재 확인")
                .platform("교보문고")
                .build());
            
            resources.add(PlanResponse.LearningResource.builder()
                .type("course")
                .title(keyword + " 강의 검색")
                .url("https://www.inflearn.com/courses?s=" + encodedKeyword + "&order=seq")
                .description("인프런에서 인기 강의 확인")
                .platform("인프런")
                .build());
            
            resources.add(PlanResponse.LearningResource.builder()
                .type("video")
                .title(keyword + " 유튜브 강의 검색")
                .url("https://www.youtube.com/results?search_query=" + encodedKeyword + "+강의&sp=CAM%3D")
                .description("유튜브에서 무료 강의 확인")
                .platform("유튜브")
                .build());
        } catch (Exception e) {
            log.warn("기본 자료 생성 실패", e);
        }
        
        return resources;
    }
    
    /**
     * 기본 계획 (AI 실패 시)
     */
    private PlanResponse getDefaultPlan(PlanGenerationRequest request) {
        LocalDate today = LocalDate.now();
        LocalDate deadline = request.getDeadline();
        long weeks = ChronoUnit.WEEKS.between(today, deadline);
        
        List<PlanResponse.MilestoneDto> milestones = new ArrayList<>();
        for (int i = 1; i <= Math.min(weeks, 4); i++) {
            milestones.add(PlanResponse.MilestoneDto.builder()
                .title(String.format("Week %d: 기초 학습", i))
                .description(String.format("%d주차 목표 달성", i))
                .targetDate(today.plusWeeks(i))
                .estimatedHours(10)
                .orderIndex(i)
                .build());
        }
        
        List<PlanResponse.ScheduleRecommendation> schedules = new ArrayList<>();
        for (int day = 0; day < 7; day++) {
            LocalDate scheduleDate = today.plusDays(day);
            
            schedules.add(PlanResponse.ScheduleRecommendation.builder()
                .date(scheduleDate.format(DateTimeFormatter.ISO_DATE))
                .startTime("09:00")
                .endTime("10:30")
                .title(request.getGoalTitle() + " 학습")
                .description("기본 학습 세션")
                .type("work")
                .priority("high")
                .energyLevel("high")
                .build());
            
            schedules.add(PlanResponse.ScheduleRecommendation.builder()
                .date(scheduleDate.format(DateTimeFormatter.ISO_DATE))
                .startTime("10:30")
                .endTime("10:45")
                .title("휴식")
                .description("스트레칭 및 휴식")
                .type("break")
                .priority("medium")
                .energyLevel("medium")
                .build());
        }
        
        return PlanResponse.builder()
            .milestones(milestones)
            .schedules(schedules)
            .strategy("ADHD 특성을 고려한 짧은 세션과 규칙적인 휴식으로 구성된 계획입니다.")
            .differentiator("맞춤형 일정으로 지속 가능한 학습을 지원합니다.")
            .build();
    }
    
    /**
     * 로드맵 스타일 생성 (3가지 옵션)
     */
    public List<RoadmapStyleResponse> generateRoadmapStyles(
        RoadmapOptionsRequest request, 
        String apiKey
    ) {
        log.info("로드맵 스타일 생성 시작 - 목표: {}", request.getGoalTitle());
        
        String prompt = buildRoadmapStylePrompt(request);
        
        try {
            String aiResponse = geminiChatAdapter.chatWithWebSearch(prompt, apiKey);
            log.debug("AI 로드맵 스타일 응답 수신 (길이: {})", aiResponse.length());
            
            List<RoadmapStyleResponse> styles = parseRoadmapStylesFromAI(aiResponse);
            
            log.info("로드맵 스타일 생성 완료 - 스타일 수: {}", styles.size());
            return styles;
            
        } catch (Exception e) {
            log.error("로드맵 스타일 생성 실패", e);
            return getDefaultRoadmapStyles();
        }
    }
    
    /**
     * 로드맵 스타일 프롬프트 구성
     */
    private String buildRoadmapStylePrompt(RoadmapOptionsRequest request) {
        StringBuilder answersText = new StringBuilder();
        if (request.getAnswers() != null) {
            request.getAnswers().forEach((key, value) -> 
                answersText.append(String.format("- %s: %s\n", key, value))
            );
        }
        
        String description = request.getGoalDescription() != null ? 
            request.getGoalDescription() : "설명 없음";
        
        return String.format("""
            사용자의 목표: %s
            설명: %s
            답변 정보:
            %s
            
            웹 검색을 통해 최신 학습 트렌드를 파악하고, 다음 3가지 로드맵 스타일을 제안하세요:
            
            1. 속성 코스 (Intensive):
               - 빠른 목표 달성 (짧은 기간, 높은 강도)
               - 이미 기초가 있는 학습자
               - 집중적인 학습 가능한 사람
            
            2. 탄탄 기초 코스 (Solid):
               - 체계적이고 완벽한 학습 (중간 기간, 중간 강도)
               - 기초부터 탄탄히 다지고 싶은 학습자
               - 시간 여유가 있는 사람
            
            3. 실전 중심 코스 (Practical):
               - 실전 문제 위주 (중간 기간, 실습 중심)
               - 이론보다 실전 경험이 필요한 학습자
               - 빠른 적용이 필요한 사람
            
            각 스타일마다 다음 정보를 JSON으로 반환:
            {
              "styles": [
                {
                  "styleId": "intensive|solid|practical",
                  "styleName": "한글 이름",
                  "description": "2-3문장 설명",
                  "targetAudience": "대상자",
                  "totalWeeks": 주차수,
                  "weeklyHours": 주당시간,
                  "features": ["특징1", "특징2", "특징3"],
                  "difficulty": "high|medium|low"
                }
              ]
            }
            
            주의: JSON 형식만 반환하세요. 다른 텍스트는 포함하지 마세요.
            """, 
            request.getGoalTitle(),
            description,
            answersText.toString()
        );
    }
    
    /**
     * AI 응답에서 로드맵 스타일 파싱
     */
    private List<RoadmapStyleResponse> parseRoadmapStylesFromAI(String aiResponse) {
        try {
            String jsonPart = extractJSON(aiResponse);
            
            Map<String, Object> responseMap = objectMapper.readValue(
                jsonPart, 
                new TypeReference<Map<String, Object>>() {}
            );
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> styleMaps = 
                (List<Map<String, Object>>) responseMap.getOrDefault("styles", List.of());
            
            List<RoadmapStyleResponse> styles = new ArrayList<>();
            for (Map<String, Object> sMap : styleMaps) {
                @SuppressWarnings("unchecked")
                List<String> features = (List<String>) sMap.getOrDefault("features", List.of());
                
                RoadmapStyleResponse style = RoadmapStyleResponse.builder()
                    .styleId((String) sMap.get("styleId"))
                    .styleName((String) sMap.get("styleName"))
                    .description((String) sMap.get("description"))
                    .targetAudience((String) sMap.get("targetAudience"))
                    .totalWeeks(((Number) sMap.get("totalWeeks")).intValue())
                    .weeklyHours(((Number) sMap.get("weeklyHours")).intValue())
                    .features(features)
                    .difficulty((String) sMap.get("difficulty"))
                    .build();
                styles.add(style);
            }
            
            return styles;
            
        } catch (Exception e) {
            log.error("로드맵 스타일 파싱 실패", e);
            throw new RuntimeException("로드맵 스타일 파싱 실패", e);
        }
    }
    
    /**
     * 기본 로드맵 스타일 (AI 실패 시)
     */
    private List<RoadmapStyleResponse> getDefaultRoadmapStyles() {
        List<RoadmapStyleResponse> styles = new ArrayList<>();
        
        styles.add(RoadmapStyleResponse.builder()
            .styleId("intensive")
            .styleName("속성 코스")
            .description("짧은 기간에 집중적으로 학습하는 코스입니다. 높은 강도의 학습이 가능한 분들에게 추천합니다.")
            .targetAudience("빠르게 목표를 달성하고 싶은 분")
            .totalWeeks(4)
            .weeklyHours(20)
            .features(List.of("빠른 진행", "높은 강도", "집중 학습"))
            .difficulty("high")
            .build());
        
        styles.add(RoadmapStyleResponse.builder()
            .styleId("solid")
            .styleName("탄탄 기초 코스")
            .description("체계적으로 기초부터 탄탄히 다지는 코스입니다. 충분한 시간을 가지고 완벽하게 학습하고 싶은 분들에게 추천합니다.")
            .targetAudience("기초부터 체계적으로 배우고 싶은 분")
            .totalWeeks(8)
            .weeklyHours(12)
            .features(List.of("체계적 학습", "충분한 복습", "기초 탄탄"))
            .difficulty("medium")
            .build());
        
        styles.add(RoadmapStyleResponse.builder()
            .styleId("practical")
            .styleName("실전 중심 코스")
            .description("이론보다는 실전 프로젝트 중심으로 학습하는 코스입니다. 빠르게 실무에 적용하고 싶은 분들에게 추천합니다.")
            .targetAudience("실전 경험을 빠르게 쌓고 싶은 분")
            .totalWeeks(6)
            .weeklyHours(15)
            .features(List.of("프로젝트 중심", "실전 경험", "빠른 적용"))
            .difficulty("medium")
            .build());
        
        return styles;
    }
    
    /**
     * 주차별 옵션 생성
     */
    public WeekOptionsResponse generateWeekOptions(
        String goalTitle,
        String roadmapStyle,
        Integer weekNumber,
        String weekTheme,
        String apiKey
    ) {
        log.info("주차별 옵션 생성 시작 - 목표: {}, 주차: {}", goalTitle, weekNumber);
        
        String prompt = buildWeekOptionsPrompt(goalTitle, roadmapStyle, weekNumber, weekTheme);
        
        try {
            String aiResponse = geminiChatAdapter.chatWithWebSearch(prompt, apiKey);
            log.debug("AI 주차별 옵션 응답 수신 (길이: {})", aiResponse.length());
            
            WeekOptionsResponse options = parseWeekOptionsFromAI(aiResponse);
            
            log.info("주차별 옵션 생성 완료 - 옵션 수: {}", options.getResourceOptions().size());
            return options;
            
        } catch (Exception e) {
            log.error("주차별 옵션 생성 실패", e);
            return getDefaultWeekOptions(weekNumber, weekTheme);
        }
    }
    
    /**
     * 주차별 옵션 프롬프트 구성
     */
    private String buildWeekOptionsPrompt(
        String goalTitle, 
        String roadmapStyle, 
        Integer weekNumber, 
        String weekTheme
    ) {
        return String.format("""
            당신은 학습 자료 추천 전문가입니다. 사용자가 직접 검색할 수 있도록 구체적인 검색 키워드와 플랫폼을 안내해주세요.
            
            ## 학습 목표
            - 전체 목표: %s
            - 학습 스타일: %s
            - 현재 주차: %d주차
            - 주차 테마: %s
            
            ## 추천 가이드 생성 방법
            
            각 플랫폼별로 **어떤 키워드로 검색**하면 좋은지, **어떤 유형의 자료**를 찾으면 좋은지 구체적으로 안내하세요:
            
            ### 교재 추천 (교보문고/예스24)
            - 검색 키워드: 목표와 주차 테마에 맞는 구체적 검색어 제시
            - 선택 기준: 베스트셀러, 최신 출판, 리뷰 평점 높은 책
            - 예시: "토익 RC 문제집", "ETS 토익 공식", "해커스 토익 실전" 등
            
            ### 온라인 강의 추천 (인프런/유데미)
            - 검색 키워드: 실용적이고 구체적인 강의 검색어 제시
            - 선택 기준: 수강생 많고, 평점 4.5 이상, 최신 강의
            - 예시: "토익 RC 단기 완성", "토익 실전 모의고사" 등
            
            ### 유튜브 무료 강의 추천
            - 검색 키워드: 유튜브에서 찾을 수 있는 구체적 검색어
            - 선택 기준: 조회수 높고, 최신 영상, 시리즈 강의
            - 예시: "토익 RC 무료 강의", "토익 문법 정리" 등
            
            ## JSON 응답 형식
            
            URL 필드에는 해당 플랫폼의 검색 결과 페이지 URL을 제공하세요.
            
            ```json
            {
              "weekNumber": %d,
              "weekTheme": "%s",
              "resourceOptions": [
                {
                  "optionId": "option_1",
                  "type": "book",
                  "title": "[검색 가이드] %s - 추천 교재 찾기",
                  "description": "교보문고에서 '%s' 키워드로 검색하시면 베스트셀러와 최신 교재를 확인할 수 있습니다. 리뷰와 평점을 참고하여 자신에게 맞는 교재를 선택하세요.",
                  "pros": "실시간 베스트셀러 확인, 리뷰와 평점으로 비교 가능, 다양한 출판사 교재 선택",
                  "cons": "직접 검색하여 선택해야 함, 샘플 확인 제한적",
                  "url": "https://product.kyobobook.co.kr/category/KOR/010101?page=1&sortColumn=SALES_QUANTITY&searchWord=%s",
                  "platform": "교보문고",
                  "recommended": true
                },
                {
                  "optionId": "option_2",
                  "type": "course",
                  "title": "[검색 가이드] %s - 추천 강의 찾기",
                  "description": "인프런에서 '%s' 키워드로 검색하시면 인기 강의를 확인할 수 있습니다. 수강평과 강의 미리보기로 강의를 비교하세요.",
                  "pros": "동영상으로 이해하기 쉬움, 수강평 확인 가능, 질문/답변 제공",
                  "cons": "유료 강의가 대부분, 직접 비교하여 선택해야 함",
                  "url": "https://www.inflearn.com/courses?s=%s&order=seq",
                  "platform": "인프런",
                  "recommended": false
                },
                {
                  "optionId": "option_3",
                  "type": "video",
                  "title": "[검색 가이드] %s - 무료 강의 찾기",
                  "description": "유튜브에서 '%s 강의' 키워드로 검색하시면 무료 강의를 찾을 수 있습니다. 조회수와 댓글을 확인하여 좋은 강의를 선택하세요.",
                  "pros": "완전 무료, 다양한 강사와 스타일, 언제든 접근 가능",
                  "cons": "체계적이지 않을 수 있음, 광고 포함, 품질 편차",
                  "url": "https://www.youtube.com/results?search_query=%s+강의&sp=CAM%%253D",
                  "platform": "유튜브",
                  "recommended": false
                }
              ]
            }
            ```
            
            **중요**: 
            - URL에는 검색 결과 페이지만 제공 (특정 상품/강의 URL 생성 금지)
            - title은 "[검색 가이드]"로 시작
            - description에 구체적인 검색 방법과 선택 기준 안내
            - JSON만 반환
            """, 
            goalTitle, roadmapStyle, weekNumber, weekTheme,
            weekNumber, weekTheme,
            weekTheme, weekTheme, weekTheme,
            weekTheme, weekTheme, weekTheme,
            weekTheme, weekTheme, weekTheme
        );
    }
    
    /**
     * AI 응답에서 주차별 옵션 파싱
     */
    private WeekOptionsResponse parseWeekOptionsFromAI(String aiResponse) {
        try {
            String jsonPart = extractJSON(aiResponse);
            
            Map<String, Object> responseMap = objectMapper.readValue(
                jsonPart, 
                new TypeReference<Map<String, Object>>() {}
            );
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> optionMaps = 
                (List<Map<String, Object>>) responseMap.getOrDefault("resourceOptions", List.of());
            
            List<WeekOptionsResponse.ResourceOption> options = new ArrayList<>();
            for (Map<String, Object> oMap : optionMaps) {
                WeekOptionsResponse.ResourceOption option = WeekOptionsResponse.ResourceOption.builder()
                    .optionId((String) oMap.get("optionId"))
                    .type((String) oMap.get("type"))
                    .title((String) oMap.get("title"))
                    .description((String) oMap.get("description"))
                    .pros((String) oMap.get("pros"))
                    .cons((String) oMap.get("cons"))
                    .url((String) oMap.get("url"))
                    .platform((String) oMap.get("platform"))
                    .recommended((Boolean) oMap.get("recommended"))
                    .build();
                options.add(option);
            }
            
            return WeekOptionsResponse.builder()
                .weekNumber(((Number) responseMap.get("weekNumber")).intValue())
                .weekTheme((String) responseMap.get("weekTheme"))
                .resourceOptions(options)
                .build();
            
        } catch (Exception e) {
            log.error("주차별 옵션 파싱 실패", e);
            throw new RuntimeException("주차별 옵션 파싱 실패", e);
        }
    }
    
    /**
     * 기본 주차별 옵션 (AI 실패 시)
     */
    private WeekOptionsResponse getDefaultWeekOptions(Integer weekNumber, String weekTheme) {
        List<WeekOptionsResponse.ResourceOption> options = new ArrayList<>();
        
        // weekTheme에서 목표 키워드 추출
        String goalKeyword = weekTheme != null && weekTheme.contains(":") 
            ? weekTheme.split(":")[1].trim() 
            : (weekTheme != null ? weekTheme : "학습");
        
        // 교재 추천 (교보문고 베스트셀러 페이지)
        options.add(WeekOptionsResponse.ResourceOption.builder()
            .optionId("option_1")
            .type("book")
            .title(String.format("%s - 교보문고 베스트셀러 확인", goalKeyword))
            .description(String.format("'%s' 검색어로 교보문고에서 인기 교재를 직접 찾아보세요. 리뷰와 평점을 확인하여 자신에게 맞는 교재를 선택할 수 있습니다.", goalKeyword))
            .pros("실시간 베스트셀러 확인 가능, 리뷰와 평점 확인, 다양한 선택지")
            .cons("직접 검색하여 선택해야 함")
            .url(String.format("https://product.kyobobook.co.kr/category/KOR/010101?page=1&sortColumn=SALES_QUANTITY&salesGubun=KOR_SALES&per=20&type=list&searchWord=%s", 
                java.net.URLEncoder.encode(goalKeyword, java.nio.charset.StandardCharsets.UTF_8)))
            .platform("교보문고")
            .recommended(true)
            .build());
        
        // 온라인 강의 추천 (인프런 검색)
        options.add(WeekOptionsResponse.ResourceOption.builder()
            .optionId("option_2")
            .type("course")
            .title(String.format("%s - 인프런 인기 강의 확인", goalKeyword))
            .description(String.format("'%s' 검색어로 인프런에서 인기 강의를 찾아보세요. 수강평과 강의 미리보기로 강의를 선택할 수 있습니다.", goalKeyword))
            .pros("동영상 강의로 이해하기 쉬움, 수강평 확인 가능, 질문/답변 제공")
            .cons("유료 강의가 대부분, 직접 검색하여 선택해야 함")
            .url(String.format("https://www.inflearn.com/courses?s=%s&order=seq", 
                java.net.URLEncoder.encode(goalKeyword, java.nio.charset.StandardCharsets.UTF_8)))
            .platform("인프런")
            .recommended(false)
            .build());
        
        // 유튜브 무료 강의 추천
        options.add(WeekOptionsResponse.ResourceOption.builder()
            .optionId("option_3")
            .type("video")
            .title(String.format("%s - 유튜브 무료 강의 확인", goalKeyword))
            .description(String.format("'%s' 검색어로 유튜브에서 무료 강의를 찾아보세요. 조회수와 댓글을 확인하여 좋은 강의를 선택할 수 있습니다.", goalKeyword))
            .pros("완전 무료, 다양한 강사와 스타일, 언제든 접근 가능")
            .cons("체계적이지 않을 수 있음, 광고 포함, 품질 편차가 큼")
            .url(String.format("https://www.youtube.com/results?search_query=%s+강의&sp=CAM%%253D", 
                java.net.URLEncoder.encode(goalKeyword, java.nio.charset.StandardCharsets.UTF_8)))
            .platform("유튜브")
            .recommended(false)
            .build());
        
        return WeekOptionsResponse.builder()
            .weekNumber(weekNumber)
            .weekTheme(weekTheme)
            .resourceOptions(options)
            .build();
    }
    
    /**
     * 목표 요약 생성
     */
    public GoalSummaryResponse generateGoalSummary(
        RoadmapOptionsRequest request,
        String apiKey
    ) {
        log.info("목표 요약 생성 시작 - 목표: {}", request.getGoalTitle());
        
        String prompt = buildGoalSummaryPrompt(request);
        
        try {
            String aiResponse = geminiChatAdapter.chatWithWebSearch(prompt, apiKey);
            log.debug("AI 목표 요약 응답 수신 (길이: {})", aiResponse.length());
            
            GoalSummaryResponse summary = parseGoalSummaryFromAI(aiResponse);
            
            log.info("목표 요약 생성 완료");
            return summary;
            
        } catch (Exception e) {
            log.error("목표 요약 생성 실패", e);
            return getDefaultGoalSummary(request);
        }
    }
    
    /**
     * 목표 요약 프롬프트 구성
     */
    private String buildGoalSummaryPrompt(RoadmapOptionsRequest request) {
        StringBuilder answersText = new StringBuilder();
        if (request.getAnswers() != null) {
            request.getAnswers().forEach((key, value) -> 
                answersText.append(String.format("- %s: %s\n", key, value))
            );
        }
        
        String description = request.getGoalDescription() != null ? 
            request.getGoalDescription() : "설명 없음";
        
        return String.format("""
            당신은 ADHD 환자를 위한 전문 학습 컨설턴트입니다.
            
            목표 정보:
            - 제목: %s
            - 설명: %s
            
            사용자 답변:
            %s
            
            웹에서 이 목표와 관련된 최신 정보를 검색하여, 다음 내용을 분석해주세요:
            
            1. 목표 분석: 이 목표가 어떤 목표인지, 어떤 가치가 있는지 2-3문장으로 설명
            2. 예상 기간: 현실적으로 달성 가능한 주 단위 기간
            3. 난이도: high, medium, low 중 하나
            4. 핵심 권장사항: ADHD 특성을 고려한 3-4가지 구체적인 권장사항
            5. 추천 학습 방식: ADHD 친화적인 학습 접근법 (예: 포모도로, 작은 목표 설정 등)
            6. 주당 예상 학습 시간: 현실적인 시간 (시간 단위)
            7. 동기부여 메시지: 사용자를 격려하는 긍정적인 메시지
            
            다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
            {
              "goalAnalysis": "목표 분석 텍스트",
              "estimatedWeeks": 숫자,
              "difficultyLevel": "high|medium|low",
              "keyRecommendations": ["권장사항1", "권장사항2", "권장사항3"],
              "learningApproach": "추천 학습 방식",
              "estimatedHoursPerWeek": 숫자,
              "motivationalMessage": "동기부여 메시지"
            }
            """, 
            request.getGoalTitle(),
            description,
            answersText.toString()
        );
    }
    
    /**
     * AI 응답에서 목표 요약 파싱
     */
    private GoalSummaryResponse parseGoalSummaryFromAI(String aiResponse) {
        try {
            String jsonPart = extractJSON(aiResponse);
            
            Map<String, Object> responseMap = objectMapper.readValue(
                jsonPart, 
                new TypeReference<Map<String, Object>>() {}
            );
            
            @SuppressWarnings("unchecked")
            List<String> recommendations = (List<String>) responseMap.getOrDefault("keyRecommendations", List.of());
            
            return GoalSummaryResponse.builder()
                .goalAnalysis((String) responseMap.get("goalAnalysis"))
                .estimatedWeeks(((Number) responseMap.get("estimatedWeeks")).intValue())
                .difficultyLevel((String) responseMap.get("difficultyLevel"))
                .keyRecommendations(recommendations)
                .learningApproach((String) responseMap.get("learningApproach"))
                .estimatedHoursPerWeek(((Number) responseMap.get("estimatedHoursPerWeek")).intValue())
                .motivationalMessage((String) responseMap.get("motivationalMessage"))
                .build();
            
        } catch (Exception e) {
            log.error("목표 요약 파싱 실패", e);
            throw new RuntimeException("목표 요약 파싱 실패", e);
        }
    }
    
    /**
     * 기본 목표 요약 (AI 실패 시)
     */
    private GoalSummaryResponse getDefaultGoalSummary(RoadmapOptionsRequest request) {
        return GoalSummaryResponse.builder()
            .goalAnalysis(String.format("'%s' 목표를 달성하기 위한 체계적인 학습 계획을 수립합니다. " +
                "이 목표는 당신의 성장과 발전에 중요한 가치를 가지고 있습니다.", request.getGoalTitle()))
            .estimatedWeeks(8)
            .difficultyLevel("medium")
            .keyRecommendations(List.of(
                "작은 단위로 나누어 학습하세요 (ADHD 친화적)",
                "매일 정해진 시간에 학습하는 습관을 만드세요",
                "진행 상황을 시각화하여 동기부여를 유지하세요",
                "적절한 휴식과 보상을 통해 지속가능성을 높이세요"
            ))
            .learningApproach("포모도로 기법 (25분 집중 + 5분 휴식)을 활용하고, " +
                "작은 목표를 설정하여 즉각적인 성취감을 느끼는 방식을 추천합니다.")
            .estimatedHoursPerWeek(10)
            .motivationalMessage("당신은 이미 첫 걸음을 내딛었습니다. " +
                "작은 진전이 모여 큰 성취가 됩니다. 함께 목표를 달성해봐요!")
            .build();
    }
}
