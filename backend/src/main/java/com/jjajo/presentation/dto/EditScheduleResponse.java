package com.jjajo.presentation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 대화형 일정 수정 응답 (적용할 연산 목록 + 사용자 메시지)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EditScheduleResponse {

    private List<EditOperationDto> operations;
    private String message;
}
