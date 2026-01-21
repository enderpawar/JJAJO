package com.jjajo.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * AI 상담 메시지 엔티티
 * 
 * 설계 근거:
 * - 각 메시지는 하나의 대화(Conversation)에 속함
 * - role을 통해 사용자/AI 메시지 구분
 * - 메시지 이력을 보관하여 컨텍스트 유지 및 학습 데이터 활용
 */
@Entity
@Table(name = "messages", indexes = {
    @Index(name = "idx_conversation_created", columnList = "conversation_id,created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private ConversationEntity conversation;
    
    /**
     * 메시지 발신자 (user, assistant, system)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MessageRole role;
    
    /**
     * 메시지 내용
     */
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;
    
    /**
     * AI 응답에 사용된 토큰 수 (비용 추적용)
     */
    @Column(name = "token_count")
    private Integer tokenCount;
    
    /**
     * 메시지 메타데이터 (JSON)
     * 예: {"intent": "goal_clarification", "confidence": 0.95}
     */
    @Column(columnDefinition = "TEXT")
    private String metadata;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    public enum MessageRole {
        USER,       // 사용자 메시지
        ASSISTANT,  // AI 응답
        SYSTEM      // 시스템 메시지 (프롬프트 등)
    }
}
