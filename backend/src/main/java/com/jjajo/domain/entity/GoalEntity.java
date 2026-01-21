package com.jjajo.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 목표 엔티티 (JPA)
 * 
 * 설계 근거:
 * - @Table indexes: userId와 status로 자주 조회하므로 복합 인덱스 추가
 * - CascadeType.ALL: Milestone은 Goal에 종속적이므로 함께 관리
 * - orphanRemoval: Milestone이 제거되면 DB에서도 삭제
 * - FetchType.LAZY: 성능 최적화를 위해 지연 로딩 (필요시에만 로드)
 */
@Entity
@Table(name = "goals", indexes = {
    @Index(name = "idx_user_status", columnList = "user_id,status"),
    @Index(name = "idx_deadline", columnList = "deadline")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GoalEntity {
    
    @Id
    @Column(length = 36)
    private String id;
    
    @Column(name = "user_id", nullable = false, length = 100)
    private String userId;
    
    @Column(nullable = false, length = 500)
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(nullable = false)
    private LocalDate deadline;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GoalPriority priority;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GoalStatus status;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GoalCategory category;
    
    /**
     * 목표 달성에 필요한 예상 총 시간 (시간 단위)
     */
    @Column(name = "estimated_hours", nullable = false)
    private Integer estimatedHours;
    
    /**
     * 현재까지 완료한 시간 (시간 단위)
     */
    @Column(name = "completed_hours", nullable = false)
    @Builder.Default
    private Integer completedHours = 0;
    
    /**
     * AI가 생성한 목표인지 여부
     */
    @Column(name = "ai_generated", nullable = false)
    @Builder.Default
    private Boolean aiGenerated = false;
    
    /**
     * 대화 세션 ID (AI 상담 기록 추적용)
     */
    @Column(name = "conversation_id", length = 36)
    private String conversationId;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    /**
     * One-to-Many: Goal -> Milestone
     * 
     * 설계 근거:
     * - mappedBy: MilestoneEntity의 goal 필드가 외래키 소유
     * - cascade: Goal이 삭제되면 Milestone도 함께 삭제
     * - orphanRemoval: 리스트에서 제거된 Milestone은 DB에서도 삭제
     */
    @OneToMany(mappedBy = "goal", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<MilestoneEntity> milestones = new ArrayList<>();
    
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
     * 목표 진행률 계산 (비즈니스 로직)
     */
    public double getProgressPercentage() {
        if (estimatedHours == null || estimatedHours == 0) return 0.0;
        return (double) completedHours / estimatedHours * 100.0;
    }
    
    /**
     * 남은 시간 계산 (비즈니스 로직)
     */
    public int getRemainingHours() {
        return Math.max(0, estimatedHours - completedHours);
    }
    
    /**
     * Milestone 추가 헬퍼 메서드
     * 양방향 관계 동기화
     */
    public void addMilestone(MilestoneEntity milestone) {
        milestones.add(milestone);
        milestone.setGoal(this);
    }
    
    /**
     * Milestone 제거 헬퍼 메서드
     * 양방향 관계 동기화
     */
    public void removeMilestone(MilestoneEntity milestone) {
        milestones.remove(milestone);
        milestone.setGoal(null);
    }
}
