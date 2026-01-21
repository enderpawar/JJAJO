package com.jjajo.presentation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 대화로부터 생성된 목표 응답 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoalFromConversationResponse {
    
    private String goalId;
    private String title;
    private String description;
    private LocalDate deadline;
    private Integer estimatedHours;
    private Integer milestoneCount;
    private String message;
}
