package com.jjajo.application.service;

import com.jjajo.domain.model.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * AI 제안 생성 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SuggestionService {
    
    private final ConflictDetectionService conflictDetectionService;
    
    /**
     * 사용자에게 제안 생성
     */
    public List<Suggestion> generateSuggestions(
            String userId,
            List<ScheduleRequest> schedules,
            List<Goal> goals) {
        
        List<Suggestion> suggestions = new ArrayList<>();
        
        // 1. 일정 충돌 관련 제안
        suggestions.addAll(generateConflictSuggestions(userId, schedules));
        
        // 2. 목표 진행 상황 관련 제안
        suggestions.addAll(generateGoalProgressSuggestions(userId, goals, schedules));
        
        // 3. 시간 관리 제안
        suggestions.addAll(generateTimeManagementSuggestions(userId, schedules));
        
        // 4. 웰빙 제안
        suggestions.addAll(generateWellbeingSuggestions(userId, schedules));
        
        return suggestions;
    }
    
    /**
     * 일정 충돌 제안 생성
     */
    private List<Suggestion> generateConflictSuggestions(
            String userId,
            List<ScheduleRequest> schedules) {
        
        List<Suggestion> suggestions = new ArrayList<>();
        
        for (int i = 0; i < schedules.size(); i++) {
            ScheduleRequest schedule = schedules.get(i);
            List<ScheduleRequest> others = new ArrayList<>(schedules);
            others.remove(i);
            
            List<ScheduleConflict> conflicts = conflictDetectionService.detectConflicts(
                schedule, others
            );
            
            if (!conflicts.isEmpty()) {
                for (ScheduleConflict conflict : conflicts) {
                    Suggestion suggestion = Suggestion.builder()
                            .id(UUID.randomUUID().toString())
                            .userId(userId)
                            .type(Suggestion.SuggestionType.CONFLICT_RESOLUTION)
                            .priority(mapConflictSeverityToPriority(conflict.getSeverity()))
                            .title("일정 충돌 감지")
                            .description(conflict.getDescription())
                            .actions(createConflictActions(conflict))
                            .createdAt(LocalDateTime.now())
                            .dismissed(false)
                            .build();
                    
                    suggestions.add(suggestion);
                }
            }
        }
        
        return suggestions;
    }
    
    /**
     * 목표 진행 상황 제안 생성
     */
    private List<Suggestion> generateGoalProgressSuggestions(
            String userId,
            List<Goal> goals,
            List<ScheduleRequest> schedules) {
        
        List<Suggestion> suggestions = new ArrayList<>();
        
        for (Goal goal : goals) {
            if (goal.getStatus() == Goal.GoalStatus.COMPLETED || 
                goal.getStatus() == Goal.GoalStatus.CANCELLED) {
                continue;
            }
            
            // D-day 임박 체크
            long daysUntilDeadline = java.time.temporal.ChronoUnit.DAYS.between(
                LocalDate.now(), LocalDate.parse(goal.getDeadline())
            );
            
            double progress = goal.getProgressPercentage();
            
            // 진행률이 기대치보다 낮을 경우
            if (daysUntilDeadline <= 7 && progress < 70) {
                Suggestion suggestion = Suggestion.builder()
                        .id(UUID.randomUUID().toString())
                        .userId(userId)
                        .type(Suggestion.SuggestionType.GOAL_PROGRESS)
                        .priority(Suggestion.SuggestionPriority.URGENT)
                        .title(String.format("목표 진행 지연: %s", goal.getTitle()))
                        .description(String.format(
                            "마감일이 %d일 남았지만 진행률이 %.0f%%입니다. 추가 시간 배정이 필요합니다.",
                            daysUntilDeadline, progress
                        ))
                        .actions(createGoalProgressActions(goal))
                        .createdAt(LocalDateTime.now())
                        .dismissed(false)
                        .relatedGoalId(goal.getId())
                        .build();
                
                suggestions.add(suggestion);
            }
            // 목표 달성 예정
            else if (progress >= 90 && progress < 100) {
                Suggestion suggestion = Suggestion.builder()
                        .id(UUID.randomUUID().toString())
                        .userId(userId)
                        .type(Suggestion.SuggestionType.GOAL_PROGRESS)
                        .priority(Suggestion.SuggestionPriority.LOW)
                        .title(String.format("목표 거의 달성: %s", goal.getTitle()))
                        .description(String.format(
                            "현재 진행률 %.0f%%! 조금만 더 힘내세요!",
                            progress
                        ))
                        .actions(List.of())
                        .createdAt(LocalDateTime.now())
                        .dismissed(false)
                        .relatedGoalId(goal.getId())
                        .build();
                
                suggestions.add(suggestion);
            }
        }
        
        return suggestions;
    }
    
    /**
     * 시간 관리 제안 생성
     */
    private List<Suggestion> generateTimeManagementSuggestions(
            String userId,
            List<ScheduleRequest> schedules) {
        
        List<Suggestion> suggestions = new ArrayList<>();
        
        // 이번 주 일정 과부하 체크
        LocalDate today = LocalDate.now();
        LocalDate endOfWeek = today.plusDays(7);
        
        long thisWeekSchedules = schedules.stream()
                .filter(s -> {
                    try {
                        LocalDate scheduleDate = LocalDate.parse(s.getDate());
                        return !scheduleDate.isBefore(today) && scheduleDate.isBefore(endOfWeek);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .count();
        
        if (thisWeekSchedules > 30) { // 하루 평균 4개 이상
            Suggestion suggestion = Suggestion.builder()
                    .id(UUID.randomUUID().toString())
                    .userId(userId)
                    .type(Suggestion.SuggestionType.TIME_MANAGEMENT)
                    .priority(Suggestion.SuggestionPriority.HIGH)
                    .title("이번 주 일정 과다")
                    .description(String.format(
                        "이번 주에 %d개의 일정이 있습니다. 일부 일정을 다음 주로 이동하거나 우선순위가 낮은 일정을 조정하는 것을 권장합니다.",
                        thisWeekSchedules
                    ))
                    .actions(createTimeManagementActions())
                    .createdAt(LocalDateTime.now())
                    .dismissed(false)
                    .build();
            
            suggestions.add(suggestion);
        }
        
        return suggestions;
    }
    
    /**
     * 웰빙 제안 생성
     */
    private List<Suggestion> generateWellbeingSuggestions(
            String userId,
            List<ScheduleRequest> schedules) {
        
        List<Suggestion> suggestions = new ArrayList<>();
        
        // 휴식 시간 부족 체크 (간단 버전)
        LocalDate today = LocalDate.now();
        LocalDate endOfWeek = today.plusDays(7);
        
        long workSchedules = schedules.stream()
                .filter(s -> {
                    try {
                        LocalDate scheduleDate = LocalDate.parse(s.getDate());
                        return !scheduleDate.isBefore(today) && scheduleDate.isBefore(endOfWeek);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .filter(s -> !s.getTitle().contains("휴식") && !s.getTitle().contains("운동"))
                .count();
        
        long breakSchedules = schedules.stream()
                .filter(s -> {
                    try {
                        LocalDate scheduleDate = LocalDate.parse(s.getDate());
                        return !scheduleDate.isBefore(today) && scheduleDate.isBefore(endOfWeek);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .filter(s -> s.getTitle().contains("휴식") || s.getTitle().contains("운동") || s.getTitle().contains("취미"))
                .count();
        
        if (workSchedules > 20 && breakSchedules == 0) {
            Suggestion suggestion = Suggestion.builder()
                    .id(UUID.randomUUID().toString())
                    .userId(userId)
                    .type(Suggestion.SuggestionType.WELLBEING)
                    .priority(Suggestion.SuggestionPriority.MEDIUM)
                    .title("휴식 시간 부족")
                    .description(
                        "이번 주에 휴식이나 운동 일정이 없습니다. 건강과 생산성 유지를 위해 휴식 시간을 추가하는 것을 권장합니다."
                    )
                    .actions(createWellbeingActions())
                    .createdAt(LocalDateTime.now())
                    .dismissed(false)
                    .build();
            
            suggestions.add(suggestion);
        }
        
        return suggestions;
    }
    
    /**
     * 충돌 액션 생성
     */
    private List<Suggestion.SuggestionAction> createConflictActions(ScheduleConflict conflict) {
        List<Suggestion.SuggestionAction> actions = new ArrayList<>();
        
        for (ScheduleConflict.ConflictResolution resolution : conflict.getResolutions()) {
            actions.add(Suggestion.SuggestionAction.builder()
                    .label(resolution.getDescription())
                    .actionType(resolution.getType().name())
                    .actionData(resolution)
                    .build());
        }
        
        return actions;
    }
    
    /**
     * 목표 진행 액션 생성
     */
    private List<Suggestion.SuggestionAction> createGoalProgressActions(Goal goal) {
        return List.of(
            Suggestion.SuggestionAction.builder()
                    .label("추가 시간 배정하기")
                    .actionType("ADD_TIME")
                    .actionData(goal)
                    .build(),
            Suggestion.SuggestionAction.builder()
                    .label("목표 일정 재조정")
                    .actionType("RESCHEDULE_GOAL")
                    .actionData(goal)
                    .build()
        );
    }
    
    /**
     * 시간 관리 액션 생성
     */
    private List<Suggestion.SuggestionAction> createTimeManagementActions() {
        return List.of(
            Suggestion.SuggestionAction.builder()
                    .label("일정 최적화 시작")
                    .actionType("OPTIMIZE")
                    .actionData(null)
                    .build(),
            Suggestion.SuggestionAction.builder()
                    .label("무시하기")
                    .actionType("DISMISS")
                    .actionData(null)
                    .build()
        );
    }
    
    /**
     * 웰빙 액션 생성
     */
    private List<Suggestion.SuggestionAction> createWellbeingActions() {
        return List.of(
            Suggestion.SuggestionAction.builder()
                    .label("휴식 시간 추가")
                    .actionType("ADD_BREAK")
                    .actionData(null)
                    .build(),
            Suggestion.SuggestionAction.builder()
                    .label("나중에")
                    .actionType("DISMISS")
                    .actionData(null)
                    .build()
        );
    }
    
    /**
     * 충돌 심각도를 제안 우선순위로 변환
     */
    private Suggestion.SuggestionPriority mapConflictSeverityToPriority(
            ScheduleConflict.ConflictSeverity severity) {
        return switch (severity) {
            case CRITICAL -> Suggestion.SuggestionPriority.URGENT;
            case HIGH -> Suggestion.SuggestionPriority.HIGH;
            case MEDIUM -> Suggestion.SuggestionPriority.MEDIUM;
            case LOW -> Suggestion.SuggestionPriority.LOW;
        };
    }
}
