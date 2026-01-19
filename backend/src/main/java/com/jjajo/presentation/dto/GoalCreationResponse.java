package com.jjajo.presentation.dto;

import com.jjajo.domain.model.Goal;
import com.jjajo.domain.model.ScheduleRequest;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * 목표 생성 응답 DTO
 */
@Data
@Builder
public class GoalCreationResponse {
    private Goal goal;
    private List<ScheduleRequest> schedules;
    private String aiAnalysis;  // AI의 분석 및 제안
    private int totalHours;
    private int sessionsPerWeek;
    private String curriculum;  // 커리큘럼 설명
}
