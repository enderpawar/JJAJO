package com.jjajo.application.service;

import com.jjajo.application.port.in.ProcessAiChatUseCase;
import com.jjajo.domain.model.ScheduleRequest;
import com.jjajo.infrastructure.gemini.GeminiChatAdapter;
import com.jjajo.presentation.dto.AiChatRequest;
import com.jjajo.presentation.dto.AiChatResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AI 채팅 서비스 - 개인 비서 & 일정 컨설턴트
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiChatService implements ProcessAiChatUseCase {
    
    private final GeminiChatAdapter geminiChatAdapter;
    
    /**
     * AI 컨설턴트 시스템 프롬프트
     */
    private static final String CONSULTANT_SYSTEM_PROMPT = """
            당신은 사용자의 개인 비서이자 일정 컨설턴트입니다.
            
            ## 역할
            1. 사용자의 목표 달성을 돕는 코치
            2. 일정 충돌을 예방하고 해결하는 매니저
            3. 생산성을 최적화하는 분석가
            4. 균형잡힌 라이프스타일을 유지하도록 돕는 조언자
            
            ## 원칙
            - 항상 사용자의 웰빙을 최우선으로 고려
            - 실현 가능한 구체적인 제안 제공
            - 강요하지 않고 선택지 제시
            - 맥락을 이해하고 공감하는 대화
            - 한국어로 친근하고 정감있게 대화
            
            ## 일정 생성 시 고려사항
            - 날짜와 시간을 명확히 파악
            - 소요 시간 추정
            - 우선순위 판단
            - 충돌 가능성 체크
            - 준비/이동 시간 고려
            
            ## 목표 관리 시 고려사항
            - 장기 목표를 단계별로 분해
            - 현실적인 일정 배분
            - 진행 상황 모니터링
            - 필요시 조정 제안
            
            사용자의 요청을 분석하고, 일정이 필요한 경우 구체적인 정보를 추출하여 답변하세요.
            """;
    
    private final String enhancedSystemPrompt = CONSULTANT_SYSTEM_PROMPT;
    
    @Override
    public AiChatResponse processMessage(AiChatRequest request, String apiKey) {
        log.info("AI 컨설턴트 처리 시작: {}", request.getMessage());
        
        try {
            // 강화된 프롬프트로 Gemini API 호출
            String enhancedPrompt = buildEnhancedPrompt(request.getMessage());
            String aiResponse = geminiChatAdapter.chat(enhancedPrompt, apiKey);
            
            // 일정 정보 추출 시도 (개선된 로직)
            ScheduleRequest schedule = extractScheduleFromMessage(request.getMessage(), aiResponse);
            
            String conversationId = request.getConversationId() != null 
                ? request.getConversationId() 
                : UUID.randomUUID().toString();
            
            // 응답 생성
            String thinking = generateThinkingProcess(request.getMessage(), schedule);
            
            return AiChatResponse.builder()
                    .reply(aiResponse)
                    .thinking(thinking)
                    .schedule(AiChatResponse.ScheduleData.from(schedule))
                    .conversationId(conversationId)
                    .build();
                    
        } catch (Exception e) {
            log.error("AI 컨설턴트 처리 실패", e);
            return AiChatResponse.builder()
                    .reply("죄송합니다. 요청을 처리하는 중 오류가 발생했습니다. 다시 시도해주세요.")
                    .conversationId(request.getConversationId())
                    .build();
        }
    }
    
    /**
     * 강화된 프롬프트 생성
     */
    private String buildEnhancedPrompt(String userMessage) {
        return String.format("""
                %s
                
                현재 날짜: %s
                현재 시간: %s
                
                사용자 메시지: %s
                
                위 메시지를 분석하여:
                1. 일정 관련 요청인지 판단
                2. 일정이 필요한 경우 구체적인 정보 제공
                3. 목표 관련 요청인 경우 실행 가능한 계획 제안
                4. 친근하고 공감하는 어조로 응답
                
                응답해주세요.
                """,
                enhancedSystemPrompt,
                LocalDate.now(),
                LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm")),
                userMessage
        );
    }
    
    /**
     * 사고 과정 생성
     */
    private String generateThinkingProcess(String userMessage, ScheduleRequest schedule) {
        if (schedule != null) {
            return String.format(
                "사용자의 요청을 분석했습니다:\n" +
                "- 제목: %s\n" +
                "- 날짜: %s\n" +
                "- 시간: %s\n" +
                "일정을 생성하고 캘린더에 추가했습니다.",
                schedule.getTitle(),
                schedule.getDate(),
                schedule.getStartTime() != null ? schedule.getStartTime() : "미지정"
            );
        } else {
            return "사용자의 요청을 이해하고 적절한 조언을 제공했습니다.";
        }
    }
    
    /**
     * 메시지와 AI 응답에서 일정 정보 추출
     */
    private ScheduleRequest extractScheduleFromMessage(String userMessage, String aiResponse) {
        // 간단한 패턴 매칭으로 일정 정보 추출
        // TODO: 더 정교한 NLP 또는 Gemini Function Calling 사용
        
        String title = extractTitle(userMessage);
        LocalDate date = extractDate(userMessage);
        LocalTime startTime = extractTime(userMessage);
        
        if (title == null || date == null) {
            return null;
        }
        
        return ScheduleRequest.builder()
                .title(title)
                .description("AI가 생성한 일정")
                .date(date != null ? date.toString() : null)
                .startTime(startTime != null ? startTime.toString() : null)
                .endTime(startTime != null ? startTime.plusHours(1).toString() : null)
                .priority("medium")
                .build();
    }
    
    private String extractTitle(String message) {
        // "운동", "회의", "공부" 등의 키워드 추출
        String[] keywords = {"운동", "회의", "미팅", "공부", "약속", "식사", "수업", "업무"};
        for (String keyword : keywords) {
            if (message.contains(keyword)) {
                return keyword;
            }
        }
        return null;
    }
    
    private LocalDate extractDate(String message) {
        LocalDate today = LocalDate.now();
        
        if (message.contains("내일")) {
            return today.plusDays(1);
        } else if (message.contains("모레")) {
            return today.plusDays(2);
        } else if (message.contains("오늘")) {
            return today;
        } else if (message.contains("다음주")) {
            return today.plusWeeks(1);
        }
        
        // 숫자 패턴 (예: "1월 15일", "15일")
        Pattern datePattern = Pattern.compile("(\\d+)월\\s*(\\d+)일");
        Matcher matcher = datePattern.matcher(message);
        if (matcher.find()) {
            int month = Integer.parseInt(matcher.group(1));
            int day = Integer.parseInt(matcher.group(2));
            return LocalDate.of(today.getYear(), month, day);
        }
        
        return null;
    }
    
    private LocalTime extractTime(String message) {
        // "오후 3시", "15시", "3시" 등 패턴
        Pattern timePattern = Pattern.compile("(오전|오후)?\\s*(\\d+)시");
        Matcher matcher = timePattern.matcher(message);
        
        if (matcher.find()) {
            String ampm = matcher.group(1);
            int hour = Integer.parseInt(matcher.group(2));
            
            if ("오후".equals(ampm) && hour < 12) {
                hour += 12;
            } else if ("오전".equals(ampm) && hour == 12) {
                hour = 0;
            }
            
            return LocalTime.of(hour, 0);
        }
        
        return null;
    }
}
