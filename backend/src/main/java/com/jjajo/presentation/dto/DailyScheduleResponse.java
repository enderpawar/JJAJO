package com.jjajo.presentation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * AI 하루 일정 생성 응답 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyScheduleResponse {
    private List<ScheduleItem> schedule;
    private Summary summary;
    private List<Conflict> conflicts;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScheduleItem {
        private String startTime;
        private String endTime;
        private String title;
        private String description;
        private String type; // "work", "break", "meal"
        private String priority;
        private String energyLevel; // "high", "medium", "low"
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private Integer totalWorkBlocks;
        private Integer totalBreaks;
        private String bufferTime;
        private String completionProbability;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Conflict {
        private String time;
        private String existingTask;
        private String newTask;
        private String suggestion;
    }
}
