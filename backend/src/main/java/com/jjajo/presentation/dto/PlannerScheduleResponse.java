package com.jjajo.presentation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * 짜조 플래너 API 응답: 일정 목록 + 요약(선택).
 * 휴식 블록 자동 삽입, note로 세부 목표 표시.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlannerScheduleResponse {

    private List<PlanItem> plans;

    /** 오늘의 핵심 3가지 등 요약 문구 (선택) */
    private String summary;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlanItem {
        private String title;
        private String start; // HH:mm
        private String end;   // HH:mm
        /** 세부 목표·메모 (선택, UI에서 툴팁/서브텍스트로 표시) */
        private String note;
    }
}
