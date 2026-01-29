package com.jjajo.presentation.controller;

import com.jjajo.application.service.GoalPlanningService;
import com.jjajo.domain.entity.GoalEntity;
import com.jjajo.domain.entity.MilestoneEntity;
import com.jjajo.domain.model.Goal;
import com.jjajo.domain.model.Milestone;
import com.jjajo.domain.repository.GoalRepository;
import com.jjajo.presentation.config.SecurityConfig;
import com.jjajo.presentation.dto.GoalCreationRequest;
import com.jjajo.presentation.dto.GoalCreationResponse;
import com.jjajo.presentation.dto.GoalListItemResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * 목표 관리 컨트롤러 (회원별 목표 저장/조회)
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/goals")
@RequiredArgsConstructor
public class GoalController {

    private final GoalPlanningService goalPlanningService;
    private final GoalRepository goalRepository;

    /**
     * 현재 사용자의 목표 목록 조회 (회원별 플래너 로드)
     */
    @GetMapping
    public ResponseEntity<List<GoalListItemResponse>> listGoals(Authentication authentication) {
        String userId = SecurityConfig.extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        List<GoalEntity> entities = goalRepository.findByUserId(userId);
        List<GoalListItemResponse> list = entities.stream()
                .map(GoalController::toListItemResponse)
                .toList();
        return ResponseEntity.ok(list);
    }

    /**
     * AI를 활용한 목표 생성 및 계획 수립 (현재 사용자로 저장)
     */
    @PostMapping("/create-with-ai")
    public ResponseEntity<GoalCreationResponse> createGoalWithAI(
            @RequestBody GoalCreationRequest request,
            @RequestHeader("X-Gemini-API-Key") String apiKey,
            Authentication authentication) {

        String userId = SecurityConfig.extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        log.info("AI 기반 목표 생성 요청: userId={}, goal={}", userId, request.getGoalDescription());

        try {
            GoalPlanningService.PlanningResult result = goalPlanningService.createGoalPlan(
                    userId,
                    request.getGoalDescription(),
                    apiKey
            );

            Goal goal = result.getGoal();
            saveGoalToDb(goal);

            GoalCreationResponse response = GoalCreationResponse.builder()
                    .goal(goal)
                    .schedules(result.getSchedules())
                    .aiAnalysis(result.getAiAnalysis())
                    .totalHours(result.getTotalHours())
                    .sessionsPerWeek(result.getDaysPerWeek())
                    .curriculum(result.getCurriculum())
                    .build();

            log.info("목표 생성 완료: {} (일정 {}개)", goal.getTitle(), result.getSchedules().size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("목표 생성 실패", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    private void saveGoalToDb(Goal goal) {
        GoalEntity entity = GoalEntity.builder()
                .id(goal.getId())
                .userId(goal.getUserId())
                .title(goal.getTitle())
                .description(goal.getDescription())
                .deadline(LocalDate.parse(goal.getDeadline()))
                .priority(GoalEntity.GoalPriority.valueOf(goal.getPriority().name()))
                .status(GoalEntity.GoalStatus.valueOf(goal.getStatus().name()))
                .category(GoalEntity.GoalCategory.valueOf(goal.getCategory().name()))
                .estimatedHours(goal.getEstimatedHours())
                .completedHours(goal.getCompletedHours())
                .aiGenerated(true)
                .milestones(new ArrayList<>())
                .build();

        List<Milestone> milestones = goal.getMilestones() != null ? goal.getMilestones() : List.of();
        for (int i = 0; i < milestones.size(); i++) {
            Milestone m = milestones.get(i);
            MilestoneEntity me = MilestoneEntity.builder()
                    .id(m.getId() != null && !m.getId().isEmpty() ? m.getId() : UUID.randomUUID().toString())
                    .title(m.getTitle())
                    .description(m.getDescription())
                    .targetDate(LocalDate.parse(m.getTargetDate()))
                    .completed(m.isCompleted())
                    .orderIndex(i)
                    .estimatedHours(m.getEstimatedHours())
                    .build();
            entity.addMilestone(me);
        }

        goalRepository.save(entity);
    }

    private static GoalListItemResponse toListItemResponse(GoalEntity entity) {
        List<GoalListItemResponse.MilestoneItemResponse> milestones = entity.getMilestones() == null
                ? List.of()
                : entity.getMilestones().stream()
                        .map(m -> GoalListItemResponse.MilestoneItemResponse.builder()
                                .id(m.getId())
                                .goalId(entity.getId())
                                .title(m.getTitle())
                                .description(m.getDescription())
                                .targetDate(m.getTargetDate() != null ? m.getTargetDate().toString() : null)
                                .completed(Boolean.TRUE.equals(m.getCompleted()))
                                .completedDate(m.getCompletedAt() != null ? m.getCompletedAt().toLocalDate().toString() : null)
                                .estimatedHours(m.getEstimatedHours() != null ? m.getEstimatedHours() : 0)
                                .build())
                        .toList();

        return GoalListItemResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .deadline(entity.getDeadline() != null ? entity.getDeadline().toString() : null)
                .priority(entity.getPriority() != null ? entity.getPriority().name().toLowerCase() : "medium")
                .status(entity.getStatus() != null ? entity.getStatus().name().toLowerCase() : "not_started")
                .category(entity.getCategory() != null ? entity.getCategory().name().toLowerCase() : "other")
                .estimatedHours(entity.getEstimatedHours() != null ? entity.getEstimatedHours() : 0)
                .completedHours(entity.getCompletedHours() != null ? entity.getCompletedHours() : 0)
                .milestones(milestones)
                .build();
    }
}
