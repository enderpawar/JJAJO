package com.jjajo.domain.model;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * 사용자의 목표를 나타내는 도메인 모델
 */
@Data
@Builder
public class Goal {
    private String id;
    private String userId;
    private String title;
    private String description;
    private String deadline; // YYYY-MM-DD 형식
    private GoalPriority priority;
    private GoalStatus status;
    private List<Milestone> milestones;
    private GoalCategory category;
    private int estimatedHours; // 목표 달성에 필요한 예상 시간
    private int completedHours; // 완료한 시간
    
    public enum GoalPriority {
        HIGH, MEDIUM, LOW
    }
    
    public enum GoalStatus {
        NOT_STARTED,
        ON_TRACK,
        AT_RISK,
        DELAYED,
        COMPLETED,
        CANCELLED
    }
    
    public enum GoalCategory {
        WORK,
        STUDY,
        HEALTH,
        PERSONAL,
        HOBBY,
        OTHER
    }
    
    /**
     * 목표 진행률 계산
     */
    public double getProgressPercentage() {
        if (estimatedHours == 0) return 0.0;
        return (double) completedHours / estimatedHours * 100.0;
    }
    
    /**
     * 남은 시간 계산
     */
    public int getRemainingHours() {
        return Math.max(0, estimatedHours - completedHours);
    }
}
