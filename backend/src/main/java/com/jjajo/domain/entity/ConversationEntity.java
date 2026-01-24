package com.jjajo.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * AI 상담 대화 세션 엔티티
 * 
 * 설계 근거:
 * - 사용자와 AI 간의 대화 컨텍스트를 유지하기 위한 세션 관리
 * - 목표 구체화 과정을 추적하여 더 나은 추천 제공
 * - status를 통해 진행 중/완료/취소된 상담 구분
 */
@Entity
@Table(name = "conversations", indexes = {
    @Index(name = "idx_conversation_user_status", columnList = "user_id,status"),
    @Index(name = "idx_conversation_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationEntity {
    
    @Id
    @Column(length = 36)
    private String id;
    
    @Column(name = "user_id", nullable = false, length = 100)
    private String userId;
    
    /**
     * 대화 주제/제목
     */
    @Column(length = 500)
    private String topic;
    
    /**
     * 대화 타입 (goal_planning, schedule_advice, general)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ConversationType type = ConversationType.GOAL_PLANNING;
    
    /**
     * 대화 상태
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ConversationStatus status = ConversationStatus.ACTIVE;
    
    /**
     * 생성된 목표 ID (완료시 연결)
     */
    @Column(name = "goal_id", length = 36)
    private String goalId;
    
    /**
     * AI가 수집한 사용자 정보 (JSON 형태)
     * 예: {"available_hours": 2, "preferred_time": "morning", "current_level": "beginner"}
     */
    @Column(columnDefinition = "TEXT")
    private String collectedInfo;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    /**
     * One-to-Many: Conversation -> Message
     */
    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt ASC")
    @Builder.Default
    private List<MessageEntity> messages = new ArrayList<>();
    
    public enum ConversationType {
        GOAL_PLANNING,      // 목표 계획 수립
        SCHEDULE_ADVICE,    // 일정 조언
        GENERAL             // 일반 대화
    }
    
    public enum ConversationStatus {
        ACTIVE,             // 진행 중
        COMPLETED,          // 완료 (목표 생성됨)
        CANCELLED,          // 취소됨
        ARCHIVED            // 보관됨
    }
    
    /**
     * 메시지 추가 헬퍼 메서드
     */
    public void addMessage(MessageEntity message) {
        messages.add(message);
        message.setConversation(this);
    }
    
    /**
     * 대화 완료 처리
     */
    public void complete(String goalId) {
        this.status = ConversationStatus.COMPLETED;
        this.goalId = goalId;
    }
}
