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
    private final String date;        // YYYY-MM-DD 형식
    private final String startTime;  // HH:mm 형식
    private final String endTime;    // HH:mm 형식
    private final String priority;
    
    public boolean isValid() {
        return title != null && !title.trim().isEmpty() && date != null;
    }
    
    /**
     * String date를 LocalDate로 변환
     */
    public LocalDate getDateAsLocalDate() {
        return date != null ? LocalDate.parse(date) : null;
    }
    
    /**
     * String startTime을 LocalTime으로 변환
     */
    public LocalTime getStartTimeAsLocalTime() {
        return startTime != null ? LocalTime.parse(startTime) : null;
    }
    
    /**
     * String endTime을 LocalTime으로 변환
     */
    public LocalTime getEndTimeAsLocalTime() {
        return endTime != null ? LocalTime.parse(endTime) : null;
    }
}
