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
 * AI 채팅 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiChatService implements ProcessAiChatUseCase {
    
    private final GeminiChatAdapter geminiChatAdapter;
    
    @Override
    public AiChatResponse processMessage(AiChatRequest request, String apiKey) {
        log.info("AI 채팅 처리 시작: {}", request.getMessage());
        
        try {
            // Gemini API를 통해 자연어 처리
            String aiResponse = geminiChatAdapter.chat(request.getMessage(), apiKey);
            
            // 일정 정보 추출 시도
            ScheduleRequest schedule = extractScheduleFromMessage(request.getMessage(), aiResponse);
            
            String conversationId = request.getConversationId() != null 
                ? request.getConversationId() 
                : UUID.randomUUID().toString();
            
            return AiChatResponse.builder()
                    .reply(aiResponse)
                    .thinking("사용자의 요청을 분석하고 일정 정보를 추출했습니다.")
                    .schedule(AiChatResponse.ScheduleData.from(schedule))
                    .conversationId(conversationId)
                    .build();
                    
        } catch (Exception e) {
            log.error("AI 채팅 처리 실패", e);
            return AiChatResponse.builder()
                    .reply("죄송합니다. 요청을 처리하는 중 오류가 발생했습니다. 다시 시도해주세요.")
                    .conversationId(request.getConversationId())
                    .build();
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
                .date(date)
                .startTime(startTime)
                .endTime(startTime != null ? startTime.plusHours(1) : null)
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
