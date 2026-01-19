package com.jjajo.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * AI 채팅 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
public class AiChatRequest {
    
    @NotBlank(message = "메시지는 필수입니다")
    private String message;
    
    private String conversationId; // 대화 세션 ID (선택)
}
