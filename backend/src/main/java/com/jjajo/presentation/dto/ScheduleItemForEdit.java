package com.jjajo.presentation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 대화형 일정 수정 시 AI 컨텍스트로 전달하는 일정 요약 (id로 참조)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleItemForEdit {

    private String id;
    private String title;
    private String date;
    private String startTime;
    private String endTime;
}
