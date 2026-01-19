package com.jjajo.presentation.dto;

import lombok.Builder;
import lombok.Data;

/**
 * 목표 생성 요청 DTO
 */
@Data
@Builder
public class GoalCreationRequest {
    private String userId;
    private String goalDescription; // "토익 800점 달성"
    private String deadline;        // "2026-03-31"
}
