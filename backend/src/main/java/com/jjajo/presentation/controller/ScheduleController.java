package com.jjajo.presentation.controller;

import com.jjajo.application.service.ScheduleService;
import com.jjajo.presentation.config.SecurityConfig;
import com.jjajo.presentation.dto.ScheduleCreateRequest;
import com.jjajo.presentation.dto.ScheduleItemResponse;
import com.jjajo.presentation.dto.ScheduleUpdateRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Schedule", description = "회원별 일정 CRUD API")
@RestController
@RequestMapping("/api/v1/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private static final Logger DEBUG_LOG = LoggerFactory.getLogger("com.jjajo.debug");
    private final ScheduleService scheduleService;

    @Operation(summary = "현재 사용자 일정 목록 조회")
    @GetMapping
    public ResponseEntity<List<ScheduleItemResponse>> list(Authentication authentication) {
        String userId = SecurityConfig.extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        List<ScheduleItemResponse> list = scheduleService.listByUserId(userId);
        return ResponseEntity.ok(list);
    }

    @Operation(summary = "일정 생성")
    @PostMapping
    public ResponseEntity<ScheduleItemResponse> create(
            @Valid @RequestBody ScheduleCreateRequest request,
            Authentication authentication) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("location", "ScheduleController.create");
            payload.put("message", "create entry");
            Map<String, Object> data = new HashMap<>();
            data.put("authNull", authentication == null);
            data.put("principalClass", authentication != null && authentication.getPrincipal() != null ? authentication.getPrincipal().getClass().getSimpleName() : null);
            data.put("userId", SecurityConfig.extractUserId(authentication));
            payload.put("data", data);
            payload.put("timestamp", System.currentTimeMillis());
            payload.put("sessionId", "debug-session");
            payload.put("hypothesisId", "C");
            DEBUG_LOG.debug(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(payload));
        } catch (Exception ignored) {
        }
        String userId = SecurityConfig.extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        ScheduleItemResponse created = scheduleService.create(userId, request);
        return ResponseEntity.ok(created);
    }

    @Operation(summary = "일정 수정 (본인 소유만)")
    @PutMapping("/{id}")
    public ResponseEntity<ScheduleItemResponse> update(
            @PathVariable String id,
            @RequestBody ScheduleUpdateRequest request,
            Authentication authentication) {
        String userId = SecurityConfig.extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        ScheduleItemResponse updated = scheduleService.update(userId, id, request);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updated);
    }

    @Operation(summary = "일정 삭제 (본인 소유만)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable String id,
            Authentication authentication) {
        String userId = SecurityConfig.extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        boolean deleted = scheduleService.delete(userId, id);
        if (!deleted) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }
}
