package com.jjajo.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jjajo.domain.entity.*;
import com.jjajo.domain.repository.ConversationRepository;
import com.jjajo.domain.repository.GoalRepository;
import com.jjajo.infrastructure.gemini.GeminiChatAdapter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 대화형 목표 설정 서비스
 * 
 * 설계 철학:
 * 1. Multi-turn Conversation: 한 번의 입력이 아닌 여러 차례 대화로 목표 구체화
 * 2. Context Awareness: 이전 대화 내용을 기억하고 연결성 있는 상담
 * 3. User-Centric: 사용자의 상황, 가용 시간, 현재 수준 등을 충분히 파악
 * 4. Adaptive Planning: 수집한 정보에 기반한 맞춤형 계획 수립
 * 
 * 효율성 근거:
 * - @Transactional: 원자성 보장, 실패 시 롤백
 * - Repository 패턴: 데이터 접근 로직 분리
 * - JSON 기반 정보 저장: 유연한 데이터 구조
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationalGoalService {
    
    private final ConversationRepository conversationRepository;
    private final GoalRepository goalRepository;
    private final GeminiChatAdapter geminiAdapter;
    private final ObjectMapper objectMapper;
    
    /**
     * 새로운 대화 시작 또는 기존 대화 이어가기
     * 
     * @param userId 사용자 ID
     * @param userMessage 사용자 메시지
     * @param apiKey Gemini API Key
     * @return AI 응답 및 대화 상태
     */
    @Transactional
    public ConversationResponse chat(String userId, String userMessage, String apiKey) {
        log.info("[대화형 상담] 사용자: {} | 메시지: {}", userId, userMessage);
        
        // 1. 활성 대화 세션 조회 또는 생성
        ConversationEntity conversation = getOrCreateActiveConversation(userId, userMessage);
        
        // 2. 사용자 메시지 저장
        MessageEntity userMsg = MessageEntity.builder()
                .conversation(conversation)
                .role(MessageEntity.MessageRole.USER)
                .content(userMessage)
                .build();
        conversation.addMessage(userMsg);
        
        // 3. 대화 컨텍스트 구성
        List<Map<String, String>> conversationHistory = buildConversationHistory(conversation);
        
        // 4. AI 상담 프롬프트 생성
        String systemPrompt = buildConsultantPrompt(conversation);
        String aiResponse = geminiAdapter.chat(buildFullPrompt(systemPrompt, conversationHistory), apiKey);
        
        // 5. Quick Replies 제거 (프론트엔드에서 별도 처리)
        String cleanedResponse = aiResponse.replaceAll("\\[QUICK_REPLIES\\][^\\n]*", "").trim();
        
        // 6. AI 응답 저장
        MessageEntity assistantMsg = MessageEntity.builder()
                .conversation(conversation)
                .role(MessageEntity.MessageRole.ASSISTANT)
                .content(cleanedResponse)
                .build();
        conversation.addMessage(assistantMsg);
        
        // 7. 응답 분석: 충분한 정보가 수집되었는지 판단
        ConversationState state = analyzeConversationState(conversation, cleanedResponse);
        
        // 8. 수집된 정보 업데이트
        updateCollectedInfo(conversation, cleanedResponse);
        
        conversationRepository.save(conversation);
        
        log.info("[대화형 상담] 상태: {} | 응답 길이: {}", state, cleanedResponse.length());
        
        return ConversationResponse.builder()
                .conversationId(conversation.getId())
                .aiMessage(cleanedResponse)
                .state(state)
                .readyToCreateGoal(state == ConversationState.READY_TO_CREATE)
                .collectedInfo(parseCollectedInfo(conversation.getCollectedInfo()))
                .build();
    }
    
    /**
     * 목표 생성 (대화 완료 후)
     * 
     * @param conversationId 대화 세션 ID
     * @param apiKey Gemini API Key
     * @return 생성된 목표 및 일정
     */
    @Transactional
    public GoalCreationResult createGoalFromConversation(String conversationId, String apiKey) {
        log.info("[목표 생성] 대화 ID: {}", conversationId);
        
        ConversationEntity conversation = conversationRepository
                .findByIdWithMessages(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("대화를 찾을 수 없습니다: " + conversationId));
        
        if (conversation.getStatus() == ConversationEntity.ConversationStatus.COMPLETED) {
            throw new IllegalStateException("이미 완료된 대화입니다.");
        }
        
        // 수집된 정보 기반으로 상세 계획 생성
        String planningPrompt = buildFinalPlanningPrompt(conversation);
        String aiPlan = geminiAdapter.chat(planningPrompt, apiKey);
        
        // Goal 엔티티 생성
        GoalEntity goal = parseAndCreateGoal(conversation.getUserId(), conversation.getId(), aiPlan);
        goalRepository.save(goal);
        
        // 대화 완료 처리
        conversation.complete(goal.getId());
        conversationRepository.save(conversation);
        
        log.info("[목표 생성 완료] Goal ID: {} | 제목: {}", goal.getId(), goal.getTitle());
        
        return GoalCreationResult.builder()
                .goalId(goal.getId())
                .title(goal.getTitle())
                .description(goal.getDescription())
                .deadline(goal.getDeadline())
                .estimatedHours(goal.getEstimatedHours())
                .milestoneCount(goal.getMilestones().size())
                .build();
    }
    
    /**
     * 활성 대화 조회 또는 새 대화 생성
     */
    private ConversationEntity getOrCreateActiveConversation(String userId, String firstMessage) {
        return conversationRepository
                .findFirstByUserIdAndStatusOrderByCreatedAtDesc(
                        userId, 
                        ConversationEntity.ConversationStatus.ACTIVE)
                .orElseGet(() -> {
                    log.info("[새 대화 시작] 사용자: {}", userId);
                    return ConversationEntity.builder()
                            .id(UUID.randomUUID().toString())
                            .userId(userId)
                            .topic(extractTopic(firstMessage))
                            .type(ConversationEntity.ConversationType.GOAL_PLANNING)
                            .status(ConversationEntity.ConversationStatus.ACTIVE)
                            .collectedInfo("{}")
                            .build();
                });
    }
    
    /**
     * AI 상담사 시스템 프롬프트 생성
     * 
     * 핵심 전략:
     * - 충분한 정보 수집을 위한 단계적 질문
     * - 공감과 격려를 통한 신뢰 구축
     * - 구체적이고 실현 가능한 계획 수립
     */
    private String buildConsultantPrompt(ConversationEntity conversation) {
        int messageCount = conversation.getMessages().size();
        String collectedInfo = conversation.getCollectedInfo();
        
        return String.format("""
                # Role: ADHD 친화적 외장형 전두엽 AI (Implementation Intentions 기반)
                
                ## Context: ADHD 신경과학 기반 설계
                사용자는 실행 기능 결함(Executive Function Deficit)으로 인해:
                - 막연한 목표는 "위협"으로 인식 → 회피 반응
                - 시간 왜곡(Time Blindness)으로 "나중에"는 존재하지 않음
                - 인지 부하(Cognitive Load)가 높으면 즉시 이탈
                
                ## 핵심 전략: If-Then 구조 (피터 골위처 교수 연구)
                ❌ 잘못된 질문: "뭐 할래요?"
                ✅ 올바른 질문: "**만약 오후 3시가 되면(Trigger), 코딩을 시작하시겠어요?(Action)**"
                
                ## 대화 원칙
                1. **조건-행동 연결**: 모든 일정은 "If-Then" 구조로 제시
                   - "오후 4시에 운동화 신기 일정 넣을까요?"
                   - "점심 먹고 나면, 책상에 앉아서 노트북 켜기 일정 어떠세요?"
                
                2. **외적 보조 장치**: 머릿속 계획 ❌, 시각화 ✅
                   - 일정은 즉시 캘린더에 표시되어야 함
                   - "지금 화면에 보이는 그 시간"처럼 구체적으로 언급
                
                3. **작업 분해 (Task Chunking)**: 큰 작업은 10분 단위로 자동 분해
                   - "1시간 코딩" ❌
                   - "14:00 환경 설정 10분 → 14:10 함수 1개 짜기 10분 → 14:20 테스트 10분" ✅
                
                4. **즉각적 보상**: 매 작은 단위마다 도파민 피드백
                   - "✅ 10분 완료!" 같은 즉시 피드백 제공
                
                ## 대화 진행 방식 (If-Then 템플릿)
                
                ### 1단계: 트리거(Trigger) 파악
                "언제(조건)부터 시작하시겠어요?"
                - [⚡ 지금 바로] [🌅 오전 9시] [🍽️ 점심 후]
                
                ### 2단계: 행동(Action) 확정
                "그 시간에 무엇을 하시겠어요?"
                - [📚 토익 단어 10개] [🏃 스트레칭 5분] [💻 이메일 확인]
                
                ### 3단계: 자동 분해 & 즉시 등록
                "좋아요! 이렇게 쪼개서 등록할게요:"
                - 14:00 책상 정리 (5분)
                - 14:05 단어장 꺼내기 (2분)
                - 14:07 단어 10개 암기 (10분)
                
                ## 필수 정보 (최소 2가지)
                1. **트리거(If)**: 시간/상황 조건
                2. **행동(Then)**: 구체적 행동 (10분 이내 단위)
                
                ## 현재 상태
                - 대화 횟수: %d회
                - 수집된 정보: %s
                
                ## Quick Replies (If-Then 구조)
                항상 3-4가지 If-Then 선택지를 제시하세요 (시간 선택은 4가지 필수):
                
                예시 1 (시간 선택):
                [QUICK_REPLIES]
                ⚡ 지금 바로
                🌅 오전
                🍽️ 점심
                🌙 저녁
                🌃 밤
                [/QUICK_REPLIES]
                
                예시 2 (작업 선택):
                [QUICK_REPLIES]
                📚 단어 10개만 외우기
                🏃 5분 스트레칭하기
                💻 이메일 1개만 쓰기
                [/QUICK_REPLIES]
                
                예시 3 (기한 선택):
                [QUICK_REPLIES]
                ⏰ 1주일 안에 완료
                📅 이번 달 안에 완료
                🎯 3개월 계획 수립
                [/QUICK_REPLIES]
                
                ## 다음 행동 결정
                
                ### 즉시 생성 트리거
                - "짜줘", "해줘", "생성", "네", "좋아", "ㄱㄱ" → 즉시 계획 생성
                - "빨리", "지금", "바로" → 즉시 계획 생성
                - 대화 5회 초과 → 자동으로 계획 생성 제안
                
                ### 대화 진행 (If-Then 선택지 제공)
                - 목표 없음 → "무엇을 하고 싶으신가요?"
                  + 3가지 제안: [📚 공부 30분] [🏃 운동 20분] [💻 작업 1시간]
                  
                - 시간 없음 → "언제 하시겠어요?"
                  + 3가지 제안: [⚡ 지금 바로] [🌅 오전] [🌙 저녁]
                
                ### 선제적 제안
                사용자가 망설이면 (2회 이상):
                "이렇게 해볼까요? [추천 계획]"
                + 3가지 옵션: [네 좋아요] [다른 시간으로] [다시 생각할게요]
                
                ## Quick Replies 형식
                질문할 때는 가능한 3가지 선택지를 함께 제공하세요.
                
                형식:
                ```
                [QUICK_REPLIES]
                옵션1|옵션2|옵션3
                ```
                
                예시 1 (목표 질문):
                "무엇을 하고 싶으신가요?"
                [QUICK_REPLIES]
                📚 공부 30분|🏃 운동 20분|💻 작업 1시간
                
                예시 2 (시간 질문):
                "언제 하시겠어요?"
                [QUICK_REPLIES]
                ⚡ 지금 바로|🌅 오전|🌙 저녁
                
                예시 3 (제안):
                "저녁 8시에 공부 30분 어떠세요?"
                [QUICK_REPLIES]
                네 좋아요|시간 바꿔줘|다시 생각할게요
                
                ## 좋은 대화 예시
                
                ### 예시 1: 빠른 계획 수립
                ```
                사용자: "토익 공부하고 싶어"
                AI: "좋아요! 언제 하시겠어요?"
                    [QUICK_REPLIES]
                    ⚡ 지금 바로|🌅 오전|🌙 저녁
                
                사용자: [저녁] 클릭
                AI: "저녁 시간에 토익 공부 계획을 생성할게요! 😊"
                → 계획 생성 완료!
                ```
                
                ### 예시 2: 선제적 제안
                ```
                사용자: "음..."
                AI: "저녁 8시에 공부 30분 어떠세요?"
                    [QUICK_REPLIES]
                    네 좋아요|시간 바꿔줘|다시 생각할게요
                
                사용자: [네 좋아요] 클릭
                AI: "좋아요! 계획을 생성할게요 🎯"
                → 계획 생성 완료!
                ```
                
                ## 피해야 할 것
                - ❌ 너무 많은 주관식 질문
                - ❌ 불필요한 세부 정보 요청
                - ❌ 5회 이상 대화
                
                ## 빠른 종료 조건
                - 즉시 생성 키워드 감지 → 바로 생성
                - 대화 5회 초과 → "충분한 정보가 모였어요!"
                - 사용자가 선택지 2회 클릭 → 생성 가능
                
                **친절하지만 효율적으로, 빠르게 도와주세요!**
                """, messageCount, collectedInfo);
    }
    
    /**
     * 대화 히스토리를 AI 프롬프트 형식으로 변환
     */
    private List<Map<String, String>> buildConversationHistory(ConversationEntity conversation) {
        return conversation.getMessages().stream()
                .map(msg -> Map.of(
                        "role", msg.getRole().name().toLowerCase(),
                        "content", msg.getContent()
                ))
                .collect(Collectors.toList());
    }
    
    /**
     * 전체 프롬프트 구성
     */
    private String buildFullPrompt(String systemPrompt, List<Map<String, String>> history) {
        StringBuilder prompt = new StringBuilder();
        prompt.append(systemPrompt).append("\n\n");
        prompt.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        prompt.append("## 📝 대화 이력 (반드시 읽고 기억하세요!)\n");
        prompt.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        
        // 대화 번호 추가하여 가독성 향상
        int conversationTurn = 1;
        for (int i = 0; i < history.size(); i += 2) {
            // 사용자 메시지
            if (i < history.size()) {
                Map<String, String> userMsg = history.get(i);
                prompt.append(String.format("【대화 %d】\n", conversationTurn));
                prompt.append(String.format("👤 사용자: %s\n", userMsg.get("content")));
            }
            
            // AI 응답
            if (i + 1 < history.size()) {
                Map<String, String> aiMsg = history.get(i + 1);
                prompt.append(String.format("🤖 AI: %s\n", aiMsg.get("content")));
            }
            
            prompt.append("\n");
            conversationTurn++;
        }
        
        // 마지막 사용자 메시지만 있는 경우
        if (history.size() % 2 == 1) {
            Map<String, String> lastMsg = history.get(history.size() - 1);
            prompt.append(String.format("【대화 %d】\n", conversationTurn));
            prompt.append(String.format("👤 사용자: %s\n", lastMsg.get("content")));
            prompt.append("\n🤖 AI: (여기에 응답하세요)\n");
        }
        
        prompt.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        prompt.append("⚠️ 위 대화 이력을 바탕으로, 사용자가 이미 말한 정보를 다시 묻지 말고 자연스럽게 대화를 이어가세요.\n");
        prompt.append("📌 이미 수집된 정보를 요약하며 확인하고, 부족한 정보만 질문하세요.\n");
        
        return prompt.toString();
    }
    
    /**
     * 대화 상태 분석
     * - 사용자의 즉시 생성 의도 감지
     * - 최소 정보만 있어도 생성 가능하도록 완화
     */
    private ConversationState analyzeConversationState(ConversationEntity conversation, String aiResponse) {
        int messageCount = conversation.getMessages().size();
        
        // 1. 사용자가 즉시 생성 요청한 경우 (최우선)
        String lastUserMessage = conversation.getMessages().stream()
                .filter(m -> m.getRole() == MessageEntity.MessageRole.USER)
                .reduce((first, second) -> second)
                .map(MessageEntity::getContent)
                .orElse("");
        
        boolean userRequestsImmediate = lastUserMessage.matches(".*(짜줘|생성해|만들어|등록해|ㄱㄱ|빨리|어서|제발|그냥).*") ||
                                        lastUserMessage.matches(".*(대충|프로토타입|일단|바로).*짜.*") ||
                                        lastUserMessage.length() <= 5; // "ㄱㄱㄱ", "네", "해" 등
        
        // 2. AI가 "충분한 정보" 언급
        boolean aiSaysReady = aiResponse.contains("계획을 수립") ||
                              aiResponse.contains("충분한 정보") ||
                              aiResponse.contains("준비가 완료") ||
                              aiResponse.contains("함께 세워볼까요");
        
        // 3. 최소 정보 수집 확인 (목표 + 기한 or 시간)
        Map<String, Object> info = parseCollectedInfo(conversation.getCollectedInfo());
        boolean hasMinimumInfo = (info.containsKey("goal_type") || info.containsKey("target_score")) &&
                                 (info.containsKey("mentioned_deadline") || info.containsKey("mentioned_hours"));
        
        // 🚨 ADHD 모드: 즉시 생성 트리거
        if (userRequestsImmediate) {
            log.info("🔱 즉시 생성 트리거: '{}'", lastUserMessage);
            return ConversationState.READY_TO_CREATE;
        }
        
        // 대화 5회 초과 → 자동 생성 제안
        if (messageCount >= 5) {
            log.info("대화 5회 초과 ({}회). 자동 생성 단계로 전환", messageCount);
            return ConversationState.READY_TO_CREATE;
        }
        
        // AI가 준비 완료 언급
        if (aiSaysReady) {
            return ConversationState.READY_TO_CREATE;
        }
        
        // 최소 정보 있으면 즉시 생성
        if (hasMinimumInfo) {
            log.info("🔱 최소 정보 확보. 즉시 생성 가능!");
            return ConversationState.READY_TO_CREATE;
        }
        
        // 일반 진행 상태
        if (messageCount >= 5) {
            return ConversationState.COLLECTING_DETAILS;
        } else if (messageCount >= 3) {
            return ConversationState.UNDERSTANDING_CONTEXT;
        } else {
            return ConversationState.INITIAL;
        }
    }
    
    /**
     * AI 응답에서 정보 추출하여 업데이트
     * 사용자가 제공한 정보를 구조화하여 저장
     */
    private void updateCollectedInfo(ConversationEntity conversation, String aiResponse) {
        try {
            Map<String, Object> info = parseCollectedInfo(conversation.getCollectedInfo());
            
            // 모든 사용자 메시지 수집
            String allMessages = conversation.getMessages().stream()
                    .filter(m -> m.getRole() == MessageEntity.MessageRole.USER)
                    .map(MessageEntity::getContent)
                    .collect(Collectors.joining(" "));
            
            // 목표 관련
            if (allMessages.contains("토익") || allMessages.contains("TOEIC")) {
                info.put("goal_type", "토익");
                // 점수 추출
                if (allMessages.matches(".*\\d+점.*")) {
                    String[] words = allMessages.split("\\s+");
                    for (String word : words) {
                        if (word.matches("\\d+점")) {
                            String score = word.replace("점", "");
                            if (!info.containsKey("current_score")) {
                                info.put("current_score", score);
                            } else {
                                info.put("target_score", score);
                            }
                        }
                    }
                }
            }
            
            // 시간 관련
            if (allMessages.matches(".*\\d+시간.*")) {
                info.put("mentioned_hours", true);
            }
            if (allMessages.contains("아침") || allMessages.contains("오전") || 
                allMessages.contains("오후") || allMessages.contains("저녁")) {
                info.put("mentioned_time_preference", true);
            }
            
            // 기간 관련
            if (allMessages.matches(".*(\\d+)개월.*") || allMessages.matches(".*(\\d+)월.*")) {
                info.put("mentioned_deadline", true);
            }
            
            // 제약사항
            if (allMessages.contains("운동") || allMessages.contains("업무") || 
                allMessages.contains("수업")) {
                info.put("has_constraints", true);
            }
            
            // 수집 완료도 계산
            int collectedCount = 0;
            if (info.containsKey("goal_type")) collectedCount++;
            if (info.containsKey("current_score")) collectedCount++;
            if (info.containsKey("target_score")) collectedCount++;
            if (info.containsKey("mentioned_deadline")) collectedCount++;
            if (info.containsKey("mentioned_hours") || info.containsKey("mentioned_time_preference")) collectedCount++;
            
            info.put("collection_progress", collectedCount + "/5");
            info.put("is_ready", collectedCount >= 4);
            
            conversation.setCollectedInfo(objectMapper.writeValueAsString(info));
            
            log.debug("정보 수집 상태: {}", info);
        } catch (Exception e) {
            log.error("정보 업데이트 실패", e);
        }
    }
    
    /**
     * JSON 문자열을 Map으로 파싱
     */
    private Map<String, Object> parseCollectedInfo(String json) {
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (JsonProcessingException e) {
            return new HashMap<>();
        }
    }
    
    /**
     * 최종 계획 수립 프롬프트
     */
    private String buildFinalPlanningPrompt(ConversationEntity conversation) {
        String dialogueSummary = conversation.getMessages().stream()
                .map(m -> String.format("[%s]: %s", m.getRole(), m.getContent()))
                .collect(Collectors.joining("\n"));
        
        return String.format("""
                # 임무: 목표 달성 계획 수립
                
                ## 대화 내용
                %s
                
                ## 지시사항
                1. 위 대화를 분석하여 목표 달성 계획을 수립하세요
                2. **반드시 아래 JSON 형식으로만 응답하세요**
                3. **다른 설명이나 텍스트를 추가하지 마세요**
                4. **JSON만 출력하세요**
                
                ## 출력 형식 (이 형식 그대로 사용)
                {
                  "title": "구체적인 목표 제목 (예: 토익 800점 달성)",
                  "description": "상세한 학습 계획 및 커리큘럼",
                  "category": "STUDY",
                  "priority": "HIGH",
                  "weeks": 8,
                  "estimatedHours": 100,
                  "milestones": [
                    {
                      "title": "1단계: 기초 다지기",
                      "description": "기본 문법 및 어휘 학습",
                      "weekOffset": 2,
                      "estimatedHours": 30
                    },
                    {
                      "title": "2단계: 실전 연습",
                      "description": "모의고사 풀이 및 오답 분석",
                      "weekOffset": 4,
                      "estimatedHours": 40
                    },
                    {
                      "title": "3단계: 최종 점검",
                      "description": "약점 보완 및 실전 감각 유지",
                      "weekOffset": 6,
                      "estimatedHours": 30
                    }
                  ]
                }
                
                ## 중요 규칙
                - category: STUDY, WORK, HEALTH, PERSONAL, HOBBY, OTHER 중 하나
                - priority: HIGH, MEDIUM, LOW 중 하나
                - weeks: 목표 달성까지 주 수 (숫자만)
                - estimatedHours: 총 예상 시간 (숫자만)
                - milestones: 최소 2개 이상
                
                **지금 즉시 JSON만 출력하세요:**
                """, dialogueSummary);
    }
    
    /**
     * AI 응답을 파싱하여 Goal 엔티티 생성
     */
    @SuppressWarnings("unchecked")
    private GoalEntity parseAndCreateGoal(String userId, String conversationId, String aiPlan) {
        try {
            String jsonStr = extractJson(aiPlan);
            log.debug("추출된 JSON: {}", jsonStr);
            
            Map<String, Object> plan = objectMapper.readValue(jsonStr, Map.class);
            
            String goalId = UUID.randomUUID().toString();
            
            // title이 null이면 대화에서 추출
            String title = (String) plan.get("title");
            if (title == null || title.isBlank()) {
                title = extractGoalTitleFromConversation(conversationId);
            }
            
            // weeks를 Number로 받아서 int로 변환
            Object weeksObj = plan.getOrDefault("weeks", 12);
            int weeks = weeksObj instanceof Number ? ((Number) weeksObj).intValue() : 12;
            
            // estimatedHours도 Number로 받아서 int로 변환
            Object hoursObj = plan.getOrDefault("estimatedHours", 120);
            int estimatedHours = hoursObj instanceof Number ? ((Number) hoursObj).intValue() : 120;
            
            GoalEntity goal = GoalEntity.builder()
                    .id(goalId)
                    .userId(userId)
                    .conversationId(conversationId)
                    .title(title)
                    .description((String) plan.getOrDefault("description", "AI와의 상담을 통해 생성된 목표입니다."))
                    .category(GoalEntity.GoalCategory.valueOf(((String) plan.getOrDefault("category", "STUDY")).toUpperCase()))
                    .priority(GoalEntity.GoalPriority.valueOf(((String) plan.getOrDefault("priority", "MEDIUM")).toUpperCase()))
                    .status(GoalEntity.GoalStatus.NOT_STARTED)
                    .deadline(LocalDate.now().plusWeeks(weeks))
                    .estimatedHours(estimatedHours)
                    .completedHours(0)
                    .aiGenerated(true)
                    .build();
            
            // Milestones 생성
            List<Map<String, Object>> milestones = (List<Map<String, Object>>) plan.get("milestones");
            if (milestones != null) {
                int order = 0;
                for (Map<String, Object> ms : milestones) {
                    Object weekOffsetObj = ms.getOrDefault("weekOffset", order * 4);
                    int weekOffset = weekOffsetObj instanceof Number ? ((Number) weekOffsetObj).intValue() : order * 4;
                    
                    Object msHoursObj = ms.getOrDefault("estimatedHours", 30);
                    int msHours = msHoursObj instanceof Number ? ((Number) msHoursObj).intValue() : 30;
                    
                    String msTitle = (String) ms.get("title");
                    if (msTitle == null || msTitle.isBlank()) {
                        msTitle = "마일스톤 " + (order + 1);
                    }
                    
                    MilestoneEntity milestone = MilestoneEntity.builder()
                            .id(UUID.randomUUID().toString())
                            .title(msTitle)
                            .description((String) ms.getOrDefault("description", ""))
                            .targetDate(LocalDate.now().plusWeeks(weekOffset))
                            .estimatedHours(msHours)
                            .completed(false)
                            .orderIndex(order++)
                            .build();
                    goal.addMilestone(milestone);
                }
            }
            
            log.info("Goal 생성 성공: {}", goal.getTitle());
            return goal;
        } catch (Exception e) {
            log.error("Goal 파싱 실패: {}", aiPlan, e);
            // Fallback: 기본 Goal 생성
            return createDefaultGoal(userId, conversationId);
        }
    }
    
    /**
     * JSON 부분 추출 (AI 응답에서 JSON만 추출)
     */
    private String extractJson(String text) {
        int start = text.indexOf("{");
        int end = text.lastIndexOf("}");
        if (start >= 0 && end > start) {
            return text.substring(start, end + 1);
        }
        return "{}";
    }
    
    /**
     * 대화에서 목표 제목 추출
     */
    private String extractGoalTitleFromConversation(String conversationId) {
        return conversationRepository.findById(conversationId)
                .map(conv -> conv.getTopic() != null && !conv.getTopic().isBlank() 
                        ? conv.getTopic() 
                        : "목표 달성 계획")
                .orElse("목표 달성 계획");
    }
    
    /**
     * 기본 Goal 생성 (파싱 실패 시 대체)
     */
    private GoalEntity createDefaultGoal(String userId, String conversationId) {
        String title = extractGoalTitleFromConversation(conversationId);
        
        return GoalEntity.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .conversationId(conversationId)
                .title(title)
                .description("AI와의 상담을 통해 생성된 목표입니다.")
                .category(GoalEntity.GoalCategory.PERSONAL)
                .priority(GoalEntity.GoalPriority.MEDIUM)
                .status(GoalEntity.GoalStatus.NOT_STARTED)
                .deadline(LocalDate.now().plusWeeks(12))
                .estimatedHours(120)
                .completedHours(0)
                .aiGenerated(true)
                .build();
    }
    
    /**
     * 주제 추출 (첫 메시지에서)
     */
    private String extractTopic(String message) {
        return message.length() > 100 ? message.substring(0, 100) + "..." : message;
    }
    
    /**
     * 대화 상태 Enum
     */
    public enum ConversationState {
        INITIAL,                    // 초기 단계
        UNDERSTANDING_CONTEXT,      // 컨텍스트 파악 중
        COLLECTING_DETAILS,         // 세부 정보 수집 중
        READY_TO_CREATE             // 목표 생성 준비 완료
    }
    
    /**
     * 대화 응답 DTO
     */
    @lombok.Data
    @lombok.Builder
    public static class ConversationResponse {
        private String conversationId;
        private String aiMessage;
        private ConversationState state;
        private boolean readyToCreateGoal;
        private Map<String, Object> collectedInfo;
    }
    
    /**
     * 목표 생성 결과 DTO
     */
    @lombok.Data
    @lombok.Builder
    public static class GoalCreationResult {
        private String goalId;
        private String title;
        private String description;
        private LocalDate deadline;
        private Integer estimatedHours;
        private Integer milestoneCount;
    }
}
