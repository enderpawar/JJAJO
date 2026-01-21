package com.jjajo.domain.repository;

import com.jjajo.domain.entity.ConversationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Conversation 리포지토리
 * 
 * 설계 근거:
 * - 대화 세션 관리 및 이력 추적
 * - 활성 대화 빠른 조회를 위한 인덱스 활용
 */
@Repository
public interface ConversationRepository extends JpaRepository<ConversationEntity, String> {
    
    /**
     * 사용자의 활성 대화 조회
     * 한 번에 하나의 목표 상담만 진행하도록 제한
     */
    Optional<ConversationEntity> findFirstByUserIdAndStatusOrderByCreatedAtDesc(
        String userId, 
        ConversationEntity.ConversationStatus status
    );
    
    /**
     * 사용자의 모든 대화 조회 (최신순)
     */
    List<ConversationEntity> findByUserIdOrderByCreatedAtDesc(String userId);
    
    /**
     * 사용자의 완료된 대화 조회
     */
    List<ConversationEntity> findByUserIdAndStatusOrderByCreatedAtDesc(
        String userId, 
        ConversationEntity.ConversationStatus status
    );
    
    /**
     * 특정 기간 내의 대화 조회
     * 통계 및 분석용
     */
    @Query("SELECT c FROM ConversationEntity c WHERE c.userId = :userId " +
           "AND c.createdAt BETWEEN :startDate AND :endDate " +
           "ORDER BY c.createdAt DESC")
    List<ConversationEntity> findConversationsInPeriod(
        @Param("userId") String userId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    /**
     * 목표 ID로 대화 조회
     * 목표 생성 이력 추적용
     */
    Optional<ConversationEntity> findByGoalId(String goalId);
    
    /**
     * 메시지를 포함한 대화 조회 (fetch join으로 N+1 문제 해결)
     */
    @Query("SELECT c FROM ConversationEntity c LEFT JOIN FETCH c.messages " +
           "WHERE c.id = :conversationId")
    Optional<ConversationEntity> findByIdWithMessages(@Param("conversationId") String conversationId);
}
