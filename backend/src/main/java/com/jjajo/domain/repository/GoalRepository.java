package com.jjajo.domain.repository;

import com.jjajo.domain.entity.GoalEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Goal 리포지토리
 * 
 * 설계 근거:
 * - Spring Data JPA의 메서드 네이밍 규칙 활용으로 보일러플레이트 최소화
 * - 자주 사용되는 쿼리는 @Query로 최적화
 * - 복합 조건 검색을 위한 커스텀 쿼리 메서드 제공
 */
@Repository
public interface GoalRepository extends JpaRepository<GoalEntity, String> {
    
    /**
     * 사용자별 목표 조회
     * 메서드 네이밍 규칙으로 자동 쿼리 생성
     */
    List<GoalEntity> findByUserId(String userId);
    
    /**
     * 사용자별 + 상태별 목표 조회
     * 인덱스 활용 (idx_user_status)
     */
    List<GoalEntity> findByUserIdAndStatus(String userId, GoalEntity.GoalStatus status);
    
    /**
     * 사용자별 + 카테고리별 목표 조회
     */
    List<GoalEntity> findByUserIdAndCategory(String userId, GoalEntity.GoalCategory category);
    
    /**
     * 마감일이 특정 기간 내인 목표 조회
     * @param userId 사용자 ID
     * @param startDate 시작일
     * @param endDate 종료일
     */
    @Query("SELECT g FROM GoalEntity g WHERE g.userId = :userId " +
           "AND g.deadline BETWEEN :startDate AND :endDate " +
           "ORDER BY g.deadline ASC")
    List<GoalEntity> findUpcomingGoals(
        @Param("userId") String userId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    /**
     * AI가 생성한 목표 조회
     */
    List<GoalEntity> findByUserIdAndAiGenerated(String userId, Boolean aiGenerated);
    
    /**
     * 대화 세션 ID로 목표 조회
     * 상담 이력 추적용
     */
    Optional<GoalEntity> findByConversationId(String conversationId);
    
    /**
     * 진행 중인 목표 개수 조회
     * 대시보드용
     */
    @Query("SELECT COUNT(g) FROM GoalEntity g WHERE g.userId = :userId " +
           "AND g.status IN ('ON_TRACK', 'AT_RISK', 'NOT_STARTED')")
    long countActiveGoals(@Param("userId") String userId);
    
    /**
     * 완료된 목표 개수 조회
     */
    long countByUserIdAndStatus(String userId, GoalEntity.GoalStatus status);
    
    /**
     * 우선순위별 진행 중인 목표 조회
     * 성능 최적화: fetch join으로 N+1 문제 해결
     */
    @Query("SELECT g FROM GoalEntity g LEFT JOIN FETCH g.milestones " +
           "WHERE g.userId = :userId AND g.priority = :priority " +
           "AND g.status NOT IN ('COMPLETED', 'CANCELLED') " +
           "ORDER BY g.deadline ASC")
    List<GoalEntity> findActiveGoalsByPriority(
        @Param("userId") String userId,
        @Param("priority") GoalEntity.GoalPriority priority
    );
}
