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
import com.jjajo.presentation.dto.SimpleGoalCreateRequest;
import com.jjajo.presentation.dto.SimpleGoalUpdateRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.RequestMethod;

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

    @Value("${app.frontend-origin:http://localhost:5173}")
    private String frontendOrigin;

    private final GoalPlanningService goalPlanningService;
    private final GoalRepository goalRepository;

    /**
     * CORS preflight(OPTIONS) 처리 — preflight가 컨트롤러까지 오면 405가 나지 않도록 200 + CORS 헤더 반환
     */
    @RequestMapping(method = RequestMethod.OPTIONS)
    public void optionsGoals(HttpServletResponse response) {
        response.setStatus(HttpServletResponse.SC_OK);
        if (frontendOrigin != null && !frontendOrigin.isEmpty()) {
            response.setHeader("Access-Control-Allow-Origin", frontendOrigin);
        }
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Requested-With, Accept, Origin, X-Gemini-API-Key");
        response.setHeader("Access-Control-Allow-Credentials", "true");
    }

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
     * 목표 삭제 (현재 사용자 소유 목표만 삭제 가능)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGoal(@PathVariable("id") String id, Authentication authentication) {
        String userId = SecurityConfig.extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        var opt = goalRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        var entity = opt.get();
        if (entity.getUserId() == null || !entity.getUserId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }
        goalRepository.delete(entity);
        return ResponseEntity.noContent().build();
    }

    /**
     * 목표 단순 생성 (제목 + 마감일, 현재 사용자로 저장)
     */
    @PostMapping
    public ResponseEntity<GoalListItemResponse> createGoal(
            @Valid @RequestBody SimpleGoalCreateRequest request,
            Authentication authentication) {
        String userId = SecurityConfig.extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        try {
            LocalDate deadline = LocalDate.parse(request.getDeadline().trim());
            GoalEntity entity = GoalEntity.builder()
                    .id(UUID.randomUUID().toString())
                    .userId(userId)
                    .title(request.getTitle().trim())
                    .description(request.getDescription() != null ? request.getDescription().trim() : null)
                    .deadline(deadline)
                    .priority(GoalEntity.GoalPriority.MEDIUM)
                    .status(GoalEntity.GoalStatus.NOT_STARTED)
                    .category(GoalEntity.GoalCategory.OTHER)
                    .estimatedHours(0)
                    .completedHours(0)
                    .aiGenerated(false)
                    .milestones(new ArrayList<>())
                    .build();

            goalRepository.save(entity);
            log.info("목표 단순 생성 완료: userId={}, title={}", userId, entity.getTitle());
            return ResponseEntity.ok(toListItemResponse(entity));
        } catch (Exception e) {
            log.warn("목표 단순 생성 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 목표 수정 (제목 + 마감일 + 설명, 현재 사용자 소유 목표만 수정 가능)
     */
    @PutMapping("/{id}")
    public ResponseEntity<GoalListItemResponse> updateGoal(
            @PathVariable("id") String id,
            @Valid @RequestBody SimpleGoalUpdateRequest request,
            Authentication authentication) {

        String userId = SecurityConfig.extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        var opt = goalRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        var entity = opt.get();
        if (entity.getUserId() == null || !entity.getUserId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }
        try {
            entity.setTitle(request.getTitle().trim());
            entity.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
            entity.setDeadline(LocalDate.parse(request.getDeadline().trim()));
            goalRepository.save(entity);
            return ResponseEntity.ok(toListItemResponse(entity));
        } catch (Exception e) {
            log.warn("목표 수정 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
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
