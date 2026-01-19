package com.jjajo.domain.model;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * 일정 충돌 정보
 */
@Data
@Builder
public class ScheduleConflict {
    private String conflictId;
    private List<ScheduleRequest> conflictingSchedules;
    private ConflictSeverity severity;
    private String description;
    private List<ConflictResolution> resolutions;
    
    public enum ConflictSeverity {
        CRITICAL,  // 완전히 겹침
        HIGH,      // 이동 시간 부족
        MEDIUM,    // 준비 시간 부족
        LOW        // 선호 시간대 벗어남
    }
    
    @Data
    @Builder
    public static class ConflictResolution {
        private String resolutionId;
        private String description;
        private ResolutionType type;
        private List<ScheduleAdjustment> adjustments;
        
        public enum ResolutionType {
            RESCHEDULE,      // 일정 변경
            EXTEND_TIME,     // 시간 연장
            REDUCE_TIME,     // 시간 단축
            CANCEL,          // 취소
            DELEGATE         // 위임
        }
    }
    
    @Data
    @Builder
    public static class ScheduleAdjustment {
        private String scheduleId;
        private String field; // date, startTime, endTime, etc.
        private Object oldValue;
        private Object newValue;
    }
}
