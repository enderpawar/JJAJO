package com.jjajo.application.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jjajo.domain.model.QuestionType;
import com.jjajo.infrastructure.gemini.GeminiChatAdapter;
import com.jjajo.presentation.dto.QuestionGenerationRequest;
import com.jjajo.presentation.dto.QuestionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 목표 기반 질문 생성 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GoalQuestionGenerationService {
    
    private final GeminiChatAdapter geminiChatAdapter;
    private final ObjectMapper objectMapper;
    
    /**
     * AI를 활용한 맞춤 질문 생성
     */
    public List<QuestionResponse> generateQuestions(QuestionGenerationRequest request, String apiKey) {
        log.info("질문 생성 시작 - 목표: {}", request.getGoalTitle());
        
        String prompt = buildQuestionPrompt(request);
        
        try {
            // Gemini에 웹 검색 기반 질문 생성 요청
            String aiResponse = geminiChatAdapter.chatWithWebSearch(prompt, apiKey);
            log.debug("AI 응답 수신: {}", aiResponse);
            
            // JSON 파싱
            List<QuestionResponse> questions = parseQuestionsFromAI(aiResponse);
            
            log.info("질문 생성 완료 - {} 개 질문", questions.size());
            return questions;
            
        } catch (Exception e) {
            log.error("질문 생성 실패", e);
            // 실패 시 기본 질문 반환
            return getDefaultQuestions(request.getGoalTitle());
        }
    }
    
    /**
     * 질문 생성 프롬프트 구성
     */
    private String buildQuestionPrompt(QuestionGenerationRequest request) {
        String description = request.getGoalDescription() != null ? 
            request.getGoalDescription() : "";
        
        return String.format("""
            당신은 ADHD 환자를 위한 목표 계획 전문가입니다.
            
            사용자의 목표:
            - 제목: %s
            - 설명: %s
            
            웹에서 관련 정보를 검색하여, 이 목표를 달성하기 위해 필요한 4-6개의 핵심 질문을 생성하세요.
            
            질문 유형:
            - SLIDER: 숫자 범위 선택 (예: 하루 투자 가능 시간 1-8시간)
              options 형식: {"min": 1, "max": 8, "step": 1, "unit": "시간"}
            - YESNO: 이진 선택 (예: 기초 지식이 있나요?)
              options 형식: {}
            - TIME_PICKER: 시간대 선택 (예: 주로 학습 가능한 시간대)
              options 형식: {"periods": ["오전", "오후", "저녁", "새벽"]}
            
            각 질문은 다음 정보를 포함해야 합니다:
            - id: 고유 ID (q1, q2, ...)
            - questionText: 질문 내용 (명확하고 간결하게)
            - type: 질문 유형 (SLIDER, YESNO, TIME_PICKER 중 하나)
            - options: 타입별 옵션 객체
            - rationale: 왜 이 정보가 필요한지 한 줄로 설명
            
            응답은 반드시 다음 JSON 배열 형식만 출력하세요 (다른 텍스트 없이):
            [
              {
                "id": "q1",
                "questionText": "...",
                "type": "SLIDER",
                "options": {...},
                "rationale": "..."
              },
              ...
            ]
            """, 
            request.getGoalTitle(),
            description
        );
    }
    
    /**
     * AI 응답에서 질문 파싱
     */
    private List<QuestionResponse> parseQuestionsFromAI(String aiResponse) {
        try {
            // JSON 부분 추출
            String jsonPart = extractJSON(aiResponse);
            
            // JSON 배열 파싱
            List<Map<String, Object>> questionMaps = objectMapper.readValue(
                jsonPart, 
                new TypeReference<List<Map<String, Object>>>() {}
            );
            
            List<QuestionResponse> questions = new ArrayList<>();
            
            for (Map<String, Object> qMap : questionMaps) {
                QuestionType type = QuestionType.valueOf((String) qMap.get("type"));
                
                @SuppressWarnings("unchecked")
                Map<String, Object> options = (Map<String, Object>) qMap.getOrDefault("options", Map.of());
                
                QuestionResponse question = QuestionResponse.builder()
                    .id((String) qMap.get("id"))
                    .questionText((String) qMap.get("questionText"))
                    .type(type)
                    .options(options)
                    .rationale((String) qMap.get("rationale"))
                    .build();
                
                questions.add(question);
            }
            
            return questions;
            
        } catch (Exception e) {
            log.error("AI 응답 파싱 실패", e);
            throw new RuntimeException("질문 파싱 실패", e);
        }
    }
    
    /**
     * AI 응답에서 JSON 부분만 추출
     */
    private String extractJSON(String aiResponse) {
        // ```json ... ``` 형식 제거
        String cleaned = aiResponse.trim();
        
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        
        cleaned = cleaned.trim();
        
        // JSON 배열 찾기
        int arrayStart = cleaned.indexOf('[');
        int arrayEnd = cleaned.lastIndexOf(']');
        
        if (arrayStart >= 0 && arrayEnd > arrayStart) {
            return cleaned.substring(arrayStart, arrayEnd + 1);
        }
        
        return cleaned;
    }
    
    /**
     * 기본 질문 세트 (AI 실패 시)
     */
    private List<QuestionResponse> getDefaultQuestions(String goalTitle) {
        return List.of(
            QuestionResponse.builder()
                .id("q1")
                .questionText("하루에 이 목표에 투자할 수 있는 시간은?")
                .type(QuestionType.SLIDER)
                .options(Map.of("min", 1, "max", 8, "step", 1, "unit", "시간"))
                .rationale("현실적인 시간 할당을 위해 필요합니다")
                .build(),
            
            QuestionResponse.builder()
                .id("q2")
                .questionText("이 분야에 대한 기초 지식이 있나요?")
                .type(QuestionType.YESNO)
                .options(Map.of())
                .rationale("학습 시작 레벨을 결정하기 위해 필요합니다")
                .build(),
            
            QuestionResponse.builder()
                .id("q3")
                .questionText("주로 학습 가능한 시간대는?")
                .type(QuestionType.TIME_PICKER)
                .options(Map.of("periods", List.of("오전", "오후", "저녁", "새벽")))
                .rationale("에너지 피크 타임에 맞춰 일정을 배치하기 위해 필요합니다")
                .build(),
            
            QuestionResponse.builder()
                .id("q4")
                .questionText("집중 가능한 최대 시간은?")
                .type(QuestionType.SLIDER)
                .options(Map.of("min", 15, "max", 120, "step", 15, "unit", "분"))
                .rationale("ADHD 특성을 고려한 세션 길이 설정에 필요합니다")
                .build()
        );
    }
}
