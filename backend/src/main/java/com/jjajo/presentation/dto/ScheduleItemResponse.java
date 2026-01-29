package com.jjajo.presentation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 일정 조회/응답 DTO (프론트엔드 Todo 타입과 호환)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleItemResponse {

    private String id;
    private String title;
    private String description;
    private String date;
    private String startTime;
    private String endTime;
    private String status;
    private String priority;
    private String createdBy;
    private String createdAt;
    private String updatedAt;
}
