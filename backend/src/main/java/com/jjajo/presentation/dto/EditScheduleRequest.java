package com.jjajo.presentation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 대화형 일정 수정 요청 (자연어 명령 + 컨텍스트 일정 목록)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EditScheduleRequest {

    @NotBlank(message = "수정 명령을 입력해주세요")
    private String command;

    @NotNull
    @Valid
    private List<ScheduleItemForEdit> todos;
}
