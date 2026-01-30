package com.jjajo.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 매직 바 일정 파싱 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
public class ParseScheduleRequest {
    @NotBlank(message = "한 줄 명령을 입력해주세요")
    private String command;
}
