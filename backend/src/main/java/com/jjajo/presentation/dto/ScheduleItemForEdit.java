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

    /**
     * 프론트에서 전달하는 정렬 기준 순서(1부터 시작).
     * 사용자가 "첫 번째 일정"처럼 참조할 때 AI가 id를 더 안정적으로 매핑하도록 돕는다.
     */
    private Integer order;

    private String id;
    private String title;
    private String date;
    private String startTime;
    private String endTime;
}
