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

    @Size(max = 5)
    private String startTime;

    @Size(max = 5)
    private String endTime;

    @Size(max = 20)
    private String status;

    @Size(max = 20)
    private String priority;
}
