package com.jjajo.application.service;

import com.jjajo.domain.model.Goal;
import com.jjajo.domain.model.ScheduleRequest;
import com.jjajo.domain.model.UserProfile;
import com.jjajo.infrastructure.gemini.GeminiChatAdapter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 목표 기반 자동 계획 수립 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GoalPlanningService {
    
    private final GeminiChatAdapter geminiChatAdapter;
    private final GoalSchedulingService goalSchedulingService;
    
    /**
     * AI를 활용한 목표 계획 수립 (회원별 저장용 userId 사용)
     */
    public PlanningResult createGoalPlan(String userId, String goalDescription, String apiKey) {
        log.info("목표 계획 수립 시작: userId={}, goal={}", userId, goalDescription);
        
        // AI에게 목표 분석 및 계획 수립 요청
        String prompt = buildPlanningPrompt(goalDescription);
        String aiResponse = geminiChatAdapter.chat(prompt, apiKey);
        
        log.info("AI 응답: {}", aiResponse);
        
        // AI 응답 파싱
        PlanningResult result = parseAiResponse(goalDescription, aiResponse);
        
        // Goal 생성 (userId 포함)
        Goal goal = createGoalFromAnalysis(userId, result);
        result.setGoal(goal);
        
        // 기본 UserProfile 생성 (현재 사용자 기준)
        UserProfile defaultProfile = createDefaultUserProfile(userId);
        
        // 자동 일정 생성
        List<ScheduleRequest> schedules = goalSchedulingService.generateScheduleForGoal(goal, defaultProfile);
        result.setSchedules(schedules);
        
        log.info("목표 계획 수립 완료: {} 개의 일정 생성", schedules.size());
        
        return result;
    }
    
    /**
     * 계획 수립 프롬프트 생성
     */
    private String buildPlanningPrompt(String goalDescription) {
        return String.format("""
                당신은 전문 학습 컨설턴트입니다. 다음 목표를 분석하고 구체적인 학습 계획을 수립해주세요.
                
                목표: %s
                
                다음 형식으로 분석해주세요:
                
                [목표 분석]
                - 목표 제목: (간단한 제목)
                - 카테고리: (work/study/health/personal/hobby/other 중 하나)
                - 우선순위: (high/medium/low 중 하나)
                - 예상 기간: (주 단위, 예: 12주)
                - 주당 학습 시간: (시간, 예: 10시간)
                
                [커리큘럼]
                1단계: (내용)
                2단계: (내용)
                3단계: (내용)
                
                [학습 전략]
                - 하루 권장 학습 시간: (예: 2시간)
                - 주당 학습 일수: (예: 5일)
                - 주요 학습 방법: (구체적으로)
                
                [추천 일정]
                - 평일 학습 시간대: (예: 오전 9시-11시)
                - 주말 활용: (예: 토요일 오전)
                
                위 형식을 꼭 지켜서 답변해주세요.
                """, goalDescription);
    }
    
    /**
     * AI 응답 파싱
     */
    private PlanningResult parseAiResponse(String originalGoal, String aiResponse) {
        PlanningResult result = new PlanningResult();
        result.setAiAnalysis(aiResponse);
        
        // 목표 제목 추출
        String title = extractValue(aiResponse, "목표 제목[:：]\\s*(.+)");
        if (title == null || title.trim().isEmpty()) {
            title = originalGoal;
        }
        result.setTitle(title.trim());
        
        // 카테고리 추출
        String category = extractValue(aiResponse, "카테고리[:：]\\s*(\\w+)");
        result.setCategory(parseCategory(category));
        
        // 우선순위 추출
        String priority = extractValue(aiResponse, "우선순위[:：]\\s*(\\w+)");
        result.setPriority(parsePriority(priority));
        
        // 예상 기간 추출 (주 단위)
        String period = extractValue(aiResponse, "예상 기간[:：]\\s*(\\d+)");
        int weeks = period != null ? Integer.parseInt(period) : 12;
        result.setWeeks(weeks);
        
        // 주당 학습 시간 추출
        String hoursPerWeek = extractValue(aiResponse, "주당 학습 시간[:：]\\s*(\\d+)");
        int hours = hoursPerWeek != null ? Integer.parseInt(hoursPerWeek) : 10;
        result.setTotalHours(hours * weeks);
        
        // 하루 권장 학습 시간 추출
        String dailyHours = extractValue(aiResponse, "하루 권장 학습 시간[:：]\\s*(\\d+)");
        result.setHoursPerDay(dailyHours != null ? Integer.parseInt(dailyHours) : 2);
        
        // 주당 학습 일수 추출
        String daysPerWeek = extractValue(aiResponse, "주당 학습 일수[:：]\\s*(\\d+)");
        result.setDaysPerWeek(daysPerWeek != null ? Integer.parseInt(daysPerWeek) : 5);
        
        // 커리큘럼 추출
        result.setCurriculum(extractSection(aiResponse, "\\[커리큘럼\\]", "\\[학습 전략\\]"));
        
        return result;
    }
    
    /**
     * 정규식으로 값 추출
     */
    private String extractValue(String text, String pattern) {
        Pattern p = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(text);
        if (m.find()) {
            return m.group(1).trim();
        }
        return null;
    }
    
    /**
     * 섹션 추출
     */
    private String extractSection(String text, String startPattern, String endPattern) {
        Pattern p = Pattern.compile(startPattern + "(.*?)" + endPattern, Pattern.DOTALL);
        Matcher m = p.matcher(text);
        if (m.find()) {
            return m.group(1).trim();
        }
        return "";
    }
    
    /**
     * 카테고리 파싱
     */
    private Goal.GoalCategory parseCategory(String category) {
        if (category == null) return Goal.GoalCategory.STUDY;
        
        return switch (category.toLowerCase()) {
            case "work", "업무" -> Goal.GoalCategory.WORK;
            case "study", "학습", "공부" -> Goal.GoalCategory.STUDY;
            case "health", "건강", "운동" -> Goal.GoalCategory.HEALTH;
            case "personal", "개인" -> Goal.GoalCategory.PERSONAL;
            case "hobby", "취미" -> Goal.GoalCategory.HOBBY;
            default -> Goal.GoalCategory.OTHER;
        };
    }
    
    /**
     * 우선순위 파싱
     */
    private Goal.GoalPriority parsePriority(String priority) {
        if (priority == null) return Goal.GoalPriority.MEDIUM;
        
        return switch (priority.toLowerCase()) {
            case "high", "높음", "상" -> Goal.GoalPriority.HIGH;
            case "low", "낮음", "하" -> Goal.GoalPriority.LOW;
            default -> Goal.GoalPriority.MEDIUM;
        };
    }
    
    /**
     * 분석 결과로부터 Goal 생성 (userId 포함)
     */
    private Goal createGoalFromAnalysis(String userId, PlanningResult result) {
        LocalDate deadline = LocalDate.now().plusWeeks(result.getWeeks());
        
        return Goal.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .title(result.getTitle())
                .description(result.getCurriculum())
                .deadline(deadline.toString())
                .priority(result.getPriority())
                .status(Goal.GoalStatus.NOT_STARTED)
                .category(result.getCategory())
                .estimatedHours(result.getTotalHours())
                .completedHours(0)
                .milestones(List.of())
                .build();
    }
    
    /**
     * 기본 UserProfile 생성 (현재 사용자 기준)
     */
    private UserProfile createDefaultUserProfile(String userId) {
        return UserProfile.builder()
                .userId(userId)
                .name("사용자")
                .preferences(UserProfile.UserPreferences.builder()
                        .workStartTime(java.time.LocalTime.of(9, 0))
                        .workEndTime(java.time.LocalTime.of(18, 0))
                        .preferredWorkHoursPerDay(2)
                        .preferredBreakMinutes(10)
                        .preferredWorkDays(List.of("MON", "TUE", "WED", "THU", "FRI"))
                        .allowWeekendWork(false)
                        .build())
                .build();
    }
    
    /**
     * 계획 수립 결과
     */
    @lombok.Data
    public static class PlanningResult {
        private String title;
        private Goal.GoalCategory category;
        private Goal.GoalPriority priority;
        private int weeks;
        private int totalHours;
        private int hoursPerDay;
        private int daysPerWeek;
        private String curriculum;
        private String aiAnalysis;
        private Goal goal;
        private List<ScheduleRequest> schedules;
    }
}
