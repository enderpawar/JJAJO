package com.jjajo.application.service;

import com.jjajo.presentation.dto.PlannerScheduleRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * 500 원인 재현: planner-schedule과 동일한 형태로 placePlans 호출
 */
class PlannerPlacementServiceTest {

    private final PlannerPlacementService service = new PlannerPlacementService();

    @Test
    @DisplayName("study 카테고리, 6 plans, 3 slots 로 placePlans 호출 시 예외 없음")
    void placePlans_study_sixPlans_threeSlots_doesNotThrow() {
        List<PlannerPlacementService.PlanWithDuration> plans = List.of(
            new PlannerPlacementService.PlanWithDuration("알고리즘 3문제", 90, 15, "세부목표1"),
            new PlannerPlacementService.PlanWithDuration("CS 이론 복습", 120, 15, "세부목표2"),
            new PlannerPlacementService.PlanWithDuration("기출 풀이", 120, 15, null),
            new PlannerPlacementService.PlanWithDuration("정리", 60, 0, null),
            new PlannerPlacementService.PlanWithDuration("복습", 60, 10, null),
            new PlannerPlacementService.PlanWithDuration("예습", 45, 0, null)
        );
        List<PlannerScheduleRequest.TimeSlotDto> slots = List.of(
            timeSlot("09:00", "12:00"),
            timeSlot("14:00", "17:00"),
            timeSlot("19:00", "23:00")
        );
        int currentTimeMinutes = 9 * 60; // 09:00

        assertThatCode(() -> {
            var result = service.placePlans("study", plans, slots, currentTimeMinutes, true);
            assert result != null;
        }).doesNotThrowAnyException();
    }

    private static PlannerScheduleRequest.TimeSlotDto timeSlot(String start, String end) {
        var dto = new PlannerScheduleRequest.TimeSlotDto();
        dto.setStart(start);
        dto.setEnd(end);
        return dto;
    }
}
