package com.jjajo.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jjajo.domain.entity.ConversationEntity;
import com.jjajo.domain.entity.GoalEntity;
import com.jjajo.domain.entity.MessageEntity;
import com.jjajo.domain.repository.ConversationRepository;
import com.jjajo.domain.repository.GoalRepository;
import com.jjajo.infrastructure.gemini.GeminiChatAdapter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * ConversationalGoalService 단위 테스트
 * 
 * 테스트 전략:
 * 1. Mock 객체를 활용한 의존성 분리
 * 2. Given-When-Then 패턴으로 가독성 높은 테스트
 * 3. AssertJ를 활용한 유창한 검증
 * 4. 각 시나리오별 엣지 케이스 테스트
 * 
 * 효율성 근거:
 * - @ExtendWith(MockitoExtension.class): JUnit 5 + Mockito 통합
 * - @InjectMocks: 자동 의존성 주입으로 보일러플레이트 제거
 * - AssertJ: 읽기 쉬운 assertion
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("대화형 목표 설정 서비스 테스트")
class ConversationalGoalServiceTest {
    
    @Mock
    private ConversationRepository conversationRepository;
    
    @Mock
    private GoalRepository goalRepository;
    
    @Mock
    private GeminiChatAdapter geminiAdapter;
    
    @InjectMocks
    private ConversationalGoalService conversationalGoalService;
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    private String testUserId;
    private String testApiKey;
    
    @BeforeEach
    void setUp() {
        // ObjectMapper 수동 주입 (Mock 불가능)
        conversationalGoalService = new ConversationalGoalService(
                conversationRepository,
                goalRepository,
                geminiAdapter,
                objectMapper
        );
        
        testUserId = "test-user-123";
        testApiKey = "test-api-key";
    }
    
    @Test
    @DisplayName("새로운 대화 시작 - 첫 메시지 전송")
    void testChatNewConversation() {
        // Given: 활성 대화가 없는 상태
        when(conversationRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(
                anyString(), 
                any(ConversationEntity.ConversationStatus.class)
        )).thenReturn(Optional.empty());
        
        when(geminiAdapter.chat(anyString(), anyString()))
                .thenReturn("안녕하세요! 어떤 목표를 달성하고 싶으신가요?");
        
        when(conversationRepository.save(any(ConversationEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        
        // When: 첫 메시지 전송
        ConversationalGoalService.ConversationResponse response = 
                conversationalGoalService.chat(testUserId, "토익 공부 계획 세우고 싶어요", testApiKey);
        
        // Then: 새 대화가 생성되고 AI 응답이 반환됨
        assertThat(response).isNotNull();
        assertThat(response.getConversationId()).isNotNull();
        assertThat(response.getAiMessage()).contains("목표");
        assertThat(response.getState()).isEqualTo(ConversationalGoalService.ConversationState.INITIAL);
        assertThat(response.isReadyToCreateGoal()).isFalse();
        
        // Verify: Repository save 호출 확인
        verify(conversationRepository, times(1)).save(any(ConversationEntity.class));
    }
    
    @Test
    @DisplayName("기존 대화 이어가기 - 정보 수집 단계")
    void testChatContinueExistingConversation() {
        // Given: 이미 시작된 대화
        ConversationEntity existingConversation = ConversationEntity.builder()
                .id(UUID.randomUUID().toString())
                .userId(testUserId)
                .topic("토익 공부")
                .type(ConversationEntity.ConversationType.GOAL_PLANNING)
                .status(ConversationEntity.ConversationStatus.ACTIVE)
                .collectedInfo("{}")
                .messages(new ArrayList<>())
                .build();
        
        when(conversationRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(
                eq(testUserId), 
                eq(ConversationEntity.ConversationStatus.ACTIVE)
        )).thenReturn(Optional.of(existingConversation));
        
        when(geminiAdapter.chat(anyString(), anyString()))
                .thenReturn("좋습니다! 현재 토익 실력은 어느 정도인가요?");
        
        when(conversationRepository.save(any(ConversationEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        
        // When: 두 번째 메시지 전송
        ConversationalGoalService.ConversationResponse response = 
                conversationalGoalService.chat(testUserId, "현재 500점 정도입니다", testApiKey);
        
        // Then: 기존 대화에 메시지 추가
        assertThat(response.getConversationId()).isEqualTo(existingConversation.getId());
        assertThat(response.getState()).isIn(
                ConversationalGoalService.ConversationState.INITIAL,
                ConversationalGoalService.ConversationState.UNDERSTANDING_CONTEXT
        );
    }
    
    @Test
    @DisplayName("충분한 정보 수집 후 - 목표 생성 준비 완료")
    void testChatReadyToCreateGoal() {
        // Given: 여러 차례 대화를 거친 상태
        ConversationEntity conversation = ConversationEntity.builder()
                .id(UUID.randomUUID().toString())
                .userId(testUserId)
                .topic("토익 800점 달성")
                .type(ConversationEntity.ConversationType.GOAL_PLANNING)
                .status(ConversationEntity.ConversationStatus.ACTIVE)
                .collectedInfo("{\"mentioned_hours\": true, \"mentioned_days\": true}")
                .messages(new ArrayList<>())
                .build();
        
        // 이전 메시지들 추가 (7개 이상)
        for (int i = 0; i < 6; i++) {
            MessageEntity msg = MessageEntity.builder()
                    .conversation(conversation)
                    .role(i % 2 == 0 ? MessageEntity.MessageRole.USER : MessageEntity.MessageRole.ASSISTANT)
                    .content("Test message " + i)
                    .build();
            conversation.addMessage(msg);
        }
        
        when(conversationRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(
                eq(testUserId), 
                eq(ConversationEntity.ConversationStatus.ACTIVE)
        )).thenReturn(Optional.of(conversation));
        
        when(geminiAdapter.chat(anyString(), anyString()))
                .thenReturn("충분한 정보가 모였습니다! 구체적인 계획을 수립하시겠습니까?");
        
        when(conversationRepository.save(any(ConversationEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        
        // When: 최종 확인 메시지
        ConversationalGoalService.ConversationResponse response = 
                conversationalGoalService.chat(testUserId, "네, 부탁드립니다", testApiKey);
        
        // Then: 목표 생성 준비 완료 상태
        assertThat(response.getState()).isEqualTo(ConversationalGoalService.ConversationState.READY_TO_CREATE);
        assertThat(response.isReadyToCreateGoal()).isTrue();
        assertThat(response.getAiMessage()).containsAnyOf("계획", "수립", "준비");
    }
    
    @Test
    @DisplayName("대화로부터 목표 생성 - 성공")
    void testCreateGoalFromConversation() {
        // Given: 완료된 대화
        String conversationId = UUID.randomUUID().toString();
        ConversationEntity conversation = ConversationEntity.builder()
                .id(conversationId)
                .userId(testUserId)
                .topic("토익 800점")
                .type(ConversationEntity.ConversationType.GOAL_PLANNING)
                .status(ConversationEntity.ConversationStatus.ACTIVE)
                .collectedInfo("{}")
                .messages(new ArrayList<>())
                .build();
        
        when(conversationRepository.findByIdWithMessages(eq(conversationId)))
                .thenReturn(Optional.of(conversation));
        
        String aiPlanJson = """
                {
                  "title": "토익 800점 달성",
                  "description": "3개월 집중 학습",
                  "category": "STUDY",
                  "priority": "HIGH",
                  "weeks": 12,
                  "estimatedHours": 120,
                  "milestones": [
                    {
                      "title": "어휘력 강화",
                      "description": "토익 필수 단어 1000개",
                      "weekOffset": 4,
                      "estimatedHours": 30
                    }
                  ]
                }
                """;
        
        when(geminiAdapter.chat(anyString(), anyString()))
                .thenReturn(aiPlanJson);
        
        when(goalRepository.save(any(GoalEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        
        when(conversationRepository.save(any(ConversationEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        
        // When: 목표 생성
        ConversationalGoalService.GoalCreationResult result = 
                conversationalGoalService.createGoalFromConversation(conversationId, testApiKey);
        
        // Then: 목표가 성공적으로 생성됨
        assertThat(result).isNotNull();
        assertThat(result.getGoalId()).isNotNull();
        assertThat(result.getTitle()).isEqualTo("토익 800점 달성");
        assertThat(result.getEstimatedHours()).isEqualTo(120);
        assertThat(result.getMilestoneCount()).isGreaterThan(0);
        
        // Verify: Goal 저장 확인
        verify(goalRepository, times(1)).save(any(GoalEntity.class));
        verify(conversationRepository, times(1)).save(argThat(conv -> 
                conv.getStatus() == ConversationEntity.ConversationStatus.COMPLETED
        ));
    }
    
    @Test
    @DisplayName("존재하지 않는 대화로 목표 생성 시도 - 예외 발생")
    void testCreateGoalFromNonExistentConversation() {
        // Given: 존재하지 않는 대화 ID
        String nonExistentId = UUID.randomUUID().toString();
        when(conversationRepository.findByIdWithMessages(eq(nonExistentId)))
                .thenReturn(Optional.empty());
        
        // When & Then: 예외 발생 확인
        assertThatThrownBy(() -> 
                conversationalGoalService.createGoalFromConversation(nonExistentId, testApiKey))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("대화를 찾을 수 없습니다");
    }
    
    @Test
    @DisplayName("이미 완료된 대화로 목표 생성 시도 - 예외 발생")
    void testCreateGoalFromCompletedConversation() {
        // Given: 이미 완료된 대화
        String conversationId = UUID.randomUUID().toString();
        ConversationEntity completedConversation = ConversationEntity.builder()
                .id(conversationId)
                .userId(testUserId)
                .status(ConversationEntity.ConversationStatus.COMPLETED)
                .goalId("existing-goal-id")
                .messages(new ArrayList<>())
                .build();
        
        when(conversationRepository.findByIdWithMessages(eq(conversationId)))
                .thenReturn(Optional.of(completedConversation));
        
        // When & Then: 예외 발생 확인
        assertThatThrownBy(() -> 
                conversationalGoalService.createGoalFromConversation(conversationId, testApiKey))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("이미 완료된 대화");
    }
    
    @Test
    @DisplayName("Repository 계층 통합 - 대화 저장 검증")
    void testConversationPersistence() {
        // Given
        when(conversationRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(
                anyString(), any()
        )).thenReturn(Optional.empty());
        
        when(geminiAdapter.chat(anyString(), anyString()))
                .thenReturn("안녕하세요!");
        
        when(conversationRepository.save(any(ConversationEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        
        // When
        conversationalGoalService.chat(testUserId, "Hello", testApiKey);
        
        // Then: save 메서드가 ConversationEntity를 받아 호출되었는지 검증
        verify(conversationRepository).save(argThat(conversation -> 
                conversation.getUserId().equals(testUserId) &&
                conversation.getStatus() == ConversationEntity.ConversationStatus.ACTIVE &&
                conversation.getMessages().size() == 2  // user + assistant
        ));
    }
}
