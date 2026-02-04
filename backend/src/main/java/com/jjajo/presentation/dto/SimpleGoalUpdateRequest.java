package com.jjajo.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * 목표 수정 요청 DTO (제목/마감일/설명)
 */
@Getter
@Setter
public class SimpleGoalUpdateRequest {
    @NotBlank
    private String title;

    @NotBlank
    private String deadline;

    private String description;
}

