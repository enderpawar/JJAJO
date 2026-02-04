package com.jjajo.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/**
 * 데드라인 역계산 계획 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
public class BackwardsPlanRequest {

    /**
     * 사용자가 입력한 자연어 목표 설명
     */
    @NotBlank(message = "goalText는 필수입니다.")
    private String goalText;

    /**
     * 목표 마감일(YYYY-MM-DD). 있으면 AI 파싱보다 우선합니다.
     * - 목표 상세 화면에서 역계산을 실행하는 경우, 이미 알고 있는 값을 명시적으로 전달해
     *   API Key 유무와 관계없이 동일한 결과를 얻도록 합니다.
     */
    private String deadline;

    /**
     * 목표 전체에 필요한 총 투자 시간(시간). 있으면 AI 파싱보다 우선합니다.
     */
    private Integer totalHours;

    /**
     * 프런트에서 전달하는 기존 일정 요약
     */
    private List<TodoSummary> todos = new ArrayList<>();

    /**
     * 사용자 선호 작업 시간대
     */
    private List<TimeSlotPreference> timeSlotPreferences = new ArrayList<>();

    /**
     * 하루 시작/종료 시간 및 휴식 시간
     */
    private String workStartTime;
    private String workEndTime;
    private Integer breakDuration;

    /**
     * 쉬는 요일 (예: MON, TUE ...)
     */
    private List<String> daysOff = new ArrayList<>();

    /**
     * 사용자가 지정한 일당 투자 시간(시간). null이면 시간대 설정 합계로 계산.
     */
    private Integer preferredDailyHours;

    @Getter
    @Setter
    @NoArgsConstructor
    public static class TodoSummary {
        private String id;
        private String title;
        private String date;      // YYYY-MM-DD
        private String startTime; // HH:mm
        private String endTime;   // HH:mm
        private Integer durationMinutes;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class TimeSlotPreference {
        private String period;
        private int startHour;
        private int endHour;
        private int priority;
        private boolean enabled;
    }
}
