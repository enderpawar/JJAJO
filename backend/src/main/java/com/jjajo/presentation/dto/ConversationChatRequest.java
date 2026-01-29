package com.jjajo.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 대화형 채팅 요청 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConversationChatRequest {
        
    @NotBlank(message = "메시지는 필수입니다")
    private String message;
    
    /**
     * 기존 대화 이어가기 (Optional)
     */
    private String conversationId;
}
