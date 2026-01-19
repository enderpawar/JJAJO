package com.jjajo.presentation.controller;

import com.jjajo.application.port.in.ProcessAiChatUseCase;
import com.jjajo.presentation.dto.AiChatRequest;
import com.jjajo.presentation.dto.AiChatResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * AI 채팅 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/ai/chat")
@RequiredArgsConstructor
public class AiChatController {
    
    private final ProcessAiChatUseCase processAiChatUseCase;
    
    /**
     * AI와 채팅하여 일정 정보 추출
     */
    @PostMapping
    public ResponseEntity<AiChatResponse> chat(
            @Valid @RequestBody AiChatRequest request,
            @RequestHeader("X-Gemini-API-Key") String apiKey) {
        
        log.info("AI 채팅 요청 수신: {}", request.getMessage());
        
        AiChatResponse response = processAiChatUseCase.processMessage(request, apiKey);
        
        log.info("AI 채팅 응답 완료");
        
        return ResponseEntity.ok(response);
    }
}
