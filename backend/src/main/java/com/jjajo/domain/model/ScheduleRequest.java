package com.jjajo.domain.model;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * AI가 파싱한 일정 요청 정보
 */
@Getter
@Builder
public class ScheduleRequest {
    private final String title;
    private final String description;
    private final LocalDate date;
    private final LocalTime startTime;
    private final LocalTime endTime;
    private final String priority;
    
    public boolean isValid() {
        return title != null && !title.trim().isEmpty() && date != null;
    }
}
