package com.jjajo.presentation.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleUpdateRequest {

    @Size(max = 500)
    private String title;

    private String description;

    @Size(max = 10)
    private String date;

    @Size(max = 10)
    private String endDate;

    @Size(max = 5)
    private String startTime;

    @Size(max = 5)
    private String endTime;

    /** add 시 endTime 없을 때 소요시간(분). 프론트엔드 슬롯 배치에 사용 */
    private Integer durationMinutes;

    @Size(max = 20)
    private String status;

    @Size(max = 20)
    private String priority;
}
