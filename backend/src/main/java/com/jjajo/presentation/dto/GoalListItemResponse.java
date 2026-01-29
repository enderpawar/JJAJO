package com.jjajo.presentation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 목표 목록 조회용 DTO (프론트엔드 Goal 타입과 호환)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoalListItemResponse {

    private String id;
    private String userId;
    private String title;
    private String description;
    private String deadline;
    private String priority;   // high, medium, low
    private String status;     // not_started, on_track, ...
    private String category;   // work, study, ...
    private int estimatedHours;
    private int completedHours;
    private List<MilestoneItemResponse> milestones;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MilestoneItemResponse {
        private String id;
        private String goalId;
        private String title;
        private String description;
        private String targetDate;
        private boolean completed;
        private String completedDate;
        private int estimatedHours;
    }
}
