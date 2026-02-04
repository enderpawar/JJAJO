package com.jjajo.presentation.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.Collections;
import java.util.List;

/**
 * 데드라인 역계산 계획 응답 DTO
 */
@Getter
@Builder
public class BackwardsPlanResponse {

    private final String summary;
    private final int daysRemaining;
    private final int totalHours;
    private final int recommendedDailyHours;
    private final List<PlanDay> planDays;
    private final List<Conflict> conflicts;

    @Getter
    @Builder
    public static class PlanDay {
        private final String date;
        private final double plannedHours;
        private final List<PlanBlock> blocks;
    }

    @Getter
    @Builder
    public static class PlanBlock {
        private final String startTime;
        private final String endTime;
        private final String title;
        private final String description;
        private final String priority;
    }

    @Getter
    @Builder
    public static class Conflict {
        private final String date;
        private final String reason;
        private final String resolvedTo;
    }

    public static BackwardsPlanResponse emptyFallback() {
        return BackwardsPlanResponse.builder()
                .summary("계획을 생성하지 못했습니다.")
                .daysRemaining(0)
                .totalHours(0)
                .recommendedDailyHours(0)
                .planDays(Collections.emptyList())
                .conflicts(Collections.emptyList())
                .build();
    }
}
