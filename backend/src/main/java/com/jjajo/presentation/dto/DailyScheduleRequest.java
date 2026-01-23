package com.jjajo.presentation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * AI 하루 일정 생성 요청 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyScheduleRequest {
    private String goalId;
    private String goalTitle;
    private String goalDescription;
    private Integer estimatedHours;
    private String priority; // "high", "medium", "low"
    private LocalDate targetDate; // 일정을 생성할 날짜
    
    // 사용자 제약사항
    private String workStartTime; // "09:00"
    private String workEndTime;   // "18:00"
    private Integer breakDuration; // 휴식 시간 (분)
}
