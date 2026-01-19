package com.jjajo.domain.model;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * AI가 생성하는 제안
 */
@Data
@Builder
public class Suggestion {
    private String id;
    private String userId;
    private SuggestionType type;
    private SuggestionPriority priority;
    private String title;
    private String description;
    private List<SuggestionAction> actions;
    private LocalDateTime createdAt;
    private boolean dismissed;
    private String relatedGoalId;
    private String relatedScheduleId;
    
    public enum SuggestionType {
        CONFLICT_RESOLUTION,      // 일정 충돌 해결
        SCHEDULE_OPTIMIZATION,    // 일정 최적화
        GOAL_PROGRESS,           // 목표 진행 상황
        TIME_MANAGEMENT,         // 시간 관리
        WELLBEING,              // 웰빙 (수면, 휴식)
        PRODUCTIVITY,           // 생산성 개선
        REMINDER               // 리마인더
    }
    
    public enum SuggestionPriority {
        URGENT,    // 긴급 (24시간 이내 대응 필요)
        HIGH,      // 높음 (이번 주 대응 권장)
        MEDIUM,    // 보통 (참고)
        LOW        // 낮음 (선택사항)
    }
    
    @Data
    @Builder
    public static class SuggestionAction {
        private String label;
        private String actionType; // RESCHEDULE, ADD_TIME, DISMISS, ACCEPT
        private Object actionData; // 액션 실행에 필요한 데이터
    }
}
