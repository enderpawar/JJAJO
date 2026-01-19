package com.jjajo.presentation.dto;

import com.jjajo.domain.model.ScheduleRequest;
import lombok.Builder;
import lombok.Getter;

/**
 * AI 채팅 응답 DTO
 */
@Getter
@Builder
public class AiChatResponse {
    private final String reply;
    private final String thinking;
    private final ScheduleData schedule;
    private final String conversationId;
    
    @Getter
    @Builder
    public static class ScheduleData {
        private final String title;
        private final String description;
        private final String date; // YYYY-MM-DD
        private final String startTime; // HH:mm
        private final String endTime; // HH:mm
        private final String priority;
        
        public static ScheduleData from(ScheduleRequest request) {
            if (request == null) return null;
            
            return ScheduleData.builder()
                    .title(request.getTitle())
                    .description(request.getDescription())
                    .date(request.getDate() != null ? request.getDate().toString() : null)
                    .startTime(request.getStartTime() != null ? request.getStartTime().toString() : null)
                    .endTime(request.getEndTime() != null ? request.getEndTime().toString() : null)
                    .priority(request.getPriority())
                    .build();
        }
    }
}
