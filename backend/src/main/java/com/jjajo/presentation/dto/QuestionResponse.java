package com.jjajo.presentation.dto;

import com.jjajo.domain.model.QuestionType;
import lombok.Builder;
import lombok.Data;

import java.util.Map;

/**
 * 질문 응답 DTO
 */
@Data
@Builder
public class QuestionResponse {
    private String id;
    private String questionText;
    private QuestionType type;
    private Map<String, Object> options; // 슬라이더 범위, 시간 옵션 등
    private String rationale; // 왜 이 질문을 하는지 설명
}
