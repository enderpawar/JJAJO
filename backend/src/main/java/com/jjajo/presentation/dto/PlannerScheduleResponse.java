package com.jjajo.presentation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * 짜조 플래너 API 응답: [{ title, start, end }] 형식의 일정 목록
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlannerScheduleResponse {

    private List<PlanItem> plans;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlanItem {
        private String title;
        private String start; // HH:mm
        private String end;   // HH:mm
    }
}
