package com.jjajo.presentation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * 짜조 플래너 API 요청: 사용자 목표 + 가용 시간대 → 일정 분할 제안
 */
@Getter
@Setter
@NoArgsConstructor
public class PlannerScheduleRequest {

    @NotBlank(message = "목표 또는 요청을 입력해주세요")
    private String userText;

    /** 현재 시각 HH:mm (가용 슬롯은 이 시간 이후만 사용) */
    private String currentTime;

    /** 기준 날짜 yyyy-MM-dd */
    private String date;

    /** 가용 시간대 목록. 각 항목은 start(HH:mm), end(HH:mm) */
    @NotNull
    @Valid
    private List<TimeSlotDto> availableSlots = List.of();

    @Getter
    @Setter
    @NoArgsConstructor
    public static class TimeSlotDto {
        private String start; // HH:mm
        private String end;   // HH:mm
    }
}
