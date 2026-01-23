package com.jjajo.presentation.dto;

import lombok.Data;

import java.time.LocalDate;

/**
 * 간소화된 계획 생성 요청 DTO
 * 질문 답변 없이 목표 제목과 마감일만으로 계획 생성
 */
@Data
public class DirectPlanRequest {
    private String goalTitle;
    private String goalDescription;
    private LocalDate deadline;
}
