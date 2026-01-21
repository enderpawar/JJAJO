package com.jjajo.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 마일스톤 엔티티 (JPA)
 * 
 * 설계 근거:
 * - Many-to-One: 여러 Milestone이 하나의 Goal에 속함
 * - FetchType.LAZY: 필요할 때만 Goal을 로드 (N+1 문제 방지)
 * - nullable = false: Goal 없는 Milestone은 무의미
 */
@Entity
@Table(name = "milestones", indexes = {
    @Index(name = "idx_goal_order", columnList = "goal_id,order_index")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MilestoneEntity {
    
    @Id
    @Column(length = 36)
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "goal_id", nullable = false)
    private GoalEntity goal;
    
    @Column(nullable = false, length = 500)
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "target_date", nullable = false)
    private LocalDate targetDate;
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean completed = false;
    
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    
    /**
     * 순서 (정렬용)
     */
    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;
    
    /**
     * 예상 소요 시간 (시간 단위)
     */
    @Column(name = "estimated_hours")
    private Integer estimatedHours;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    /**
     * Milestone 완료 처리
     */
    public void markAsCompleted() {
        this.completed = true;
        this.completedAt = LocalDateTime.now();
    }
}
