package com.jjajo.presentation.controller;

import com.jjajo.application.service.ConversationalGoalService;
import com.jjajo.presentation.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * 대화형 목표 설정 API 컨트롤러
 * 
 * API 설계 원칙:
 * 1. RESTful: 명확한 리소스 중심 설계
 * 2. Validation: @Valid로 입력 검증 자동화
 * 3. Error Handling: 적절한 HTTP 상태 코드 반환
 * 4. Logging: 요청/응답 추적 가능
 * 
 * 엔드포인트 구조:
 * - POST /api/v1/conversations/chat: 대화 진행
 * - POST /api/v1/conversations/create-goal: 목표 생성
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/conversations")
@RequiredArgsConstructor
public class ConversationalGoalController {
    
    private final ConversationalGoalService conversationalGoalService;
    
    /**
     * 대화형 상담 채팅
     * 
     * @param request 사용자 메시지
     * @param apiKey Gemini API Key (헤더에서 전달)
     * @return AI 응답 및 대화 상태
     */
    @PostMapping("/chat")
    public ResponseEntity<ConversationChatResponse> chat(
            @Valid @RequestBody ConversationChatRequest request,
            @RequestHeader(value = "X-API-Key", required = false) String apiKey,
            Authentication authentication
    ) {
        String userId = com.jjajo.presentation.config.SecurityConfig.extractUserId(authentication);
        log.info("[대화형 상담 API] 사용자: {} | 메시지: {}",
                 userId, request.getMessage());
        
        try {
            // API Key 검증 (간단 버전)
            if (apiKey == null || apiKey.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ConversationChatResponse.builder()
                                .aiMessage("API Key가 필요합니다.")
                                .build());
            }
            
            // 대화 진행
            ConversationalGoalService.ConversationResponse response = 
                    conversationalGoalService.chat(
                            userId, 
                            request.getMessage(), 
                            apiKey
                    );
            
            // DTO 변환
            ConversationChatResponse dto = ConversationChatResponse.builder()
                    .conversationId(response.getConversationId())
                    .aiMessage(response.getAiMessage())
                    .state(response.getState().name())
                    .readyToCreateGoal(response.isReadyToCreateGoal())
                    .collectedInfo(response.getCollectedInfo())
                    .build();
            
            return ResponseEntity.ok(dto);
            
        } catch (Exception e) {
            log.error("[대화형 상담 API] 오류 발생", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ConversationChatResponse.builder()
                            .aiMessage("죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.")
                            .build());
        }
    }
    
    /**
     * 대화로부터 목표 생성
     * 
     * @param request 대화 ID
     * @param apiKey Gemini API Key
     * @return 생성된 목표 정보
     */
    @PostMapping("/create-goal")
    public ResponseEntity<GoalFromConversationResponse> createGoal(
            @Valid @RequestBody GoalFromConversationRequest request,
            @RequestHeader(value = "X-API-Key", required = false) String apiKey
    ) {
        log.info("[목표 생성 API] 대화 ID: {}", request.getConversationId());
        
        try {
            if (apiKey == null || apiKey.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(GoalFromConversationResponse.builder()
                                .message("API Key가 필요합니다.")
                                .build());
            }
            
            ConversationalGoalService.GoalCreationResult result = 
                    conversationalGoalService.createGoalFromConversation(
                            request.getConversationId(), 
                            apiKey
                    );
            
            GoalFromConversationResponse response = GoalFromConversationResponse.builder()
                    .goalId(result.getGoalId())
                    .title(result.getTitle())
                    .description(result.getDescription())
                    .deadline(result.getDeadline())
                    .estimatedHours(result.getEstimatedHours())
                    .milestoneCount(result.getMilestoneCount())
                    .message("목표가 성공적으로 생성되었습니다!")
                    .build();
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (IllegalArgumentException e) {
            log.error("[목표 생성 API] 잘못된 요청", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(GoalFromConversationResponse.builder()
                            .message(e.getMessage())
                            .build());
        } catch (IllegalStateException e) {
            log.error("[목표 생성 API] 상태 오류", e);
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(GoalFromConversationResponse.builder()
                            .message(e.getMessage())
                            .build());
        } catch (Exception e) {
            log.error("[목표 생성 API] 오류 발생", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(GoalFromConversationResponse.builder()
                            .message("목표 생성 중 오류가 발생했습니다.")
                            .build());
        }
    }
}
