package com.jjajo.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * 시간표 파싱 결과(고정 일정 후보)를 실제 주간 반복 일정으로 저장하기 위한 요청 DTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FixedScheduleSaveRequest {

    /**
     * 학기/반복 시작일 (YYYY-MM-DD).
     */
    @NotBlank
    private String startDate;

    /**
     * 학기/반복 종료일 (YYYY-MM-DD).
     */
    @NotBlank
    private String endDate;

    /**
     * 저장할 일정 후보 목록.
     */
    @NotEmpty
    private List<FixedScheduleCandidate> items;
}

