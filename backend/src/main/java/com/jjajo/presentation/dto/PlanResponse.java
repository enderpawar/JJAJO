package com.jjajo.presentation.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/**
 * 계획 응답 DTO
 */
@Data
@Builder
public class PlanResponse {
    private List<MilestoneDto> milestones;
    private List<ScheduleRecommendation> schedules;
    private String strategy; // ADHD 맞춤 전략 설명
    private String differentiator; // 다른 플래너와의 차별점
    
    /**
     * 마일스톤 DTO
     */
    @Data
    @Builder
    public static class MilestoneDto {
        private String title;
        private String description;
        private LocalDate targetDate;
        private Integer estimatedHours;
        private Integer orderIndex;
        private String learningStage; // 기초, 기본, 심화
        private List<String> keyTopics; // 주요 학습 주제들
    }
    
    /**
     * 일정 추천 DTO
     */
    @Data
    @Builder
    public static class ScheduleRecommendation {
        private String date; // yyyy-MM-dd
        private String startTime; // HH:mm
        private String endTime; // HH:mm
        private String title;
        private String description;
        private String type; // work, break, review, etc.
        private String priority; // high, medium, low
        private String energyLevel; // high, medium, low
        private List<LearningResource> resources; // 학습 자료들
    }
    
    /**
     * 학습 자료 DTO
     */
    @Data
    @Builder
    public static class LearningResource {
        private String type;        // book, course, video, article
        private String title;       // 자료 제목
        private String url;         // 링크
        private String description; // 간단한 설명
        private String platform;    // 유튜브, 책, 온라인 강의 등
    }
}
