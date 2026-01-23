package com.jjajo.presentation.dto;

import lombok.Data;

/**
 * 질문 생성 요청 DTO
 */
@Data
public class QuestionGenerationRequest {
    private String goalTitle;
    private String goalDescription; // optional
}
