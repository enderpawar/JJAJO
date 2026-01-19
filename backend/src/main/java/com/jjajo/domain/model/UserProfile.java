package com.jjajo.domain.model;

import lombok.Builder;
import lombok.Data;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;

/**
 * 사용자 프로필 및 선호도
 */
@Data
@Builder
public class UserProfile {
    private String userId;
    private String name;
    private UserPreferences preferences;
    private List<String> constraints; // 제약사항 (예: "출퇴근 시간", "점심시간 고정")
    private Map<String, Integer> productivityHours; // 시간대별 생산성 (0-23시)
    
    @Data
    @Builder
    public static class UserPreferences {
        private LocalTime workStartTime;
        private LocalTime workEndTime;
        private int preferredWorkHoursPerDay;
        private int preferredBreakMinutes;
        private List<String> preferredWorkDays; // MON, TUE, WED, THU, FRI, SAT, SUN
        private boolean allowWeekendWork;
        private int minimumSleepHours;
        private LocalTime preferredSleepTime;
        private LocalTime preferredWakeupTime;
    }
}
