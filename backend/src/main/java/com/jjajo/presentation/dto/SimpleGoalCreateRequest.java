package com.jjajo.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 목표 단순 생성 요청 (제목 + 마감일)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimpleGoalCreateRequest {
    @NotBlank(message = "목표 제목을 입력해주세요")
    private String title;
    @NotBlank(message = "마감일을 입력해주세요")
    private String deadline; // YYYY-MM-DD
    private String description;
}
