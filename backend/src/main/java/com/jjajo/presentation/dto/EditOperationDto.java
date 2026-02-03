package com.jjajo.presentation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 대화형 일정 수정 결과 연산 1건 (add / update / delete)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EditOperationDto {

    public static final String TYPE_ADD = "add";
    public static final String TYPE_UPDATE = "update";
    public static final String TYPE_DELETE = "delete";

    private String type; // "add" | "update" | "delete"
    private String scheduleId; // update/delete일 때 필수, add일 때 null

    /**
     * type이 "update"일 때만 사용. 변경할 필드만 포함.
     */
    private ScheduleUpdateRequest updatePayload;

    /**
     * type이 "add"일 때만 사용. 새 일정 정보 (title, date, startTime, endTime).
     */
    private ScheduleUpdateRequest addPayload;
}
