package com.jjajo.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 대화로부터 목표 생성 요청 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GoalFromConversationRequest {
    
    @NotBlank(message = "대화 ID는 필수입니다")
    private String conversationId;
}
