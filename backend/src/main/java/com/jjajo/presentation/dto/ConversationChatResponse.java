package com.jjajo.presentation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * 대화형 채팅 응답 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationChatResponse {
    
    private String conversationId;
    private String aiMessage;
    private String state;
    private boolean readyToCreateGoal;
    private Map<String, Object> collectedInfo;
    private int messageCount;
}
