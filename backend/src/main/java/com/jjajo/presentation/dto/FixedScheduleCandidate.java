package com.jjajo.presentation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 시간표 이미지에서 추출된 고정 일정 후보 DTO.
 *
 * 프론트엔드 미리보기/수정 단계에서 사용하는 공통 스키마이다.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FixedScheduleCandidate {

    /**
     * 과목/활동 이름 (예: "자료구조", "근로", "문학의 이해")
     */
    private String title;

    /**
     * 요일 - MON,TUE,WED,THU,FRI,SAT,SUN 중 하나.
     */
    private String dayOfWeek;

    /**
     * 시작 시간 HH:mm (24시간 형식). 예: "09:00"
     */
    private String startTime;

    /**
     * 종료 시간 HH:mm (24시간 형식). 예: "10:15"
     */
    private String endTime;

    /**
     * 강의실/장소 (선택). 예: "5남532"
     */
    private String location;

    /**
     * 비고/추가 메모 (선택).
     */
    private String notes;

    /**
     * 원본 출처 (EVERYTIME, SCHOOL_PORTAL, ETC 등 선택).
     */
    private String source;
}

