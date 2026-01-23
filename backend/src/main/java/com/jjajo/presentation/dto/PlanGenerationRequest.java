package com.jjajo.presentation.dto;

import lombok.Data;

import java.time.LocalDate;
import java.util.Map;

/**
 * 계획 생성 요청 DTO
 */
@Data
public class PlanGenerationRequest {
    private String goalTitle;
    private String goalDescription;
    private LocalDate deadline;
    private Map<String, Object> answers; // 질문 ID -> 답변
}
