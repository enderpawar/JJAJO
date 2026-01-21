package com.jjajo.domain.repository;

import com.jjajo.domain.entity.MilestoneEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Milestone 리포지토리
 * 
 * 설계 근거:
 * - Goal의 하위 엔티티이지만 독립적인 조회 필요
 * - 마감일 기준 정렬로 진행 상황 추적
 */
@Repository
public interface MilestoneRepository extends JpaRepository<MilestoneEntity, String> {
    
    /**
     * 특정 Goal의 모든 Milestone 조회 (순서대로)
     */
    @Query("SELECT m FROM MilestoneEntity m WHERE m.goal.id = :goalId ORDER BY m.orderIndex ASC")
    List<MilestoneEntity> findByGoalIdOrderByOrderIndex(@Param("goalId") String goalId);
    
    /**
     * 완료되지 않은 Milestone 조회
     */
    @Query("SELECT m FROM MilestoneEntity m WHERE m.goal.id = :goalId AND m.completed = false " +
           "ORDER BY m.targetDate ASC")
    List<MilestoneEntity> findIncompleteByGoalId(@Param("goalId") String goalId);
    
    /**
     * 오늘 마감인 Milestone 조회
     */
    @Query("SELECT m FROM MilestoneEntity m WHERE m.goal.userId = :userId " +
           "AND m.targetDate = :today AND m.completed = false")
    List<MilestoneEntity> findDueTodayByUserId(
        @Param("userId") String userId,
        @Param("today") LocalDate today
    );
    
    /**
     * 기간 내 Milestone 조회
     */
    @Query("SELECT m FROM MilestoneEntity m WHERE m.goal.userId = :userId " +
           "AND m.targetDate BETWEEN :startDate AND :endDate " +
           "ORDER BY m.targetDate ASC")
    List<MilestoneEntity> findMilestonesInPeriod(
        @Param("userId") String userId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
}
