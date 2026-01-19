package com.jjajo.application.port.in;

import com.jjajo.presentation.dto.AiChatRequest;
import com.jjajo.presentation.dto.AiChatResponse;

/**
 * AI 채팅 처리 유스케이스
 */
public interface ProcessAiChatUseCase {
    /**
     * AI 채팅 메시지를 처리하고 일정 정보를 추출합니다
     * 
     * @param request 채팅 요청
     * @param apiKey Gemini API 키
     * @return AI 응답 및 추출된 일정 정보
     */
    AiChatResponse processMessage(AiChatRequest request, String apiKey);
}
