package com.jjajo.application.port.in;

import com.jjajo.presentation.dto.EditScheduleResponse;
import com.jjajo.presentation.dto.ScheduleItemForEdit;

import java.util.List;

/**
 * 대화형 일정 수정 유스케이스 (자연어 명령 → 수정/삭제 연산 목록)
 */
public interface EditScheduleUseCase {

    /**
     * 자연어 명령과 현재 일정 컨텍스트를 받아 적용할 연산 목록을 반환합니다.
     *
     * @param command 사용자 자연어 명령 (예: "공부 시간 1시간 늘리고 뒤에 있는 일정 다 취소해줘")
     * @param todos   컨텍스트로 사용할 일정 목록 (id, title, date, startTime, endTime)
     * @param apiKey Gemini API 키
     * @return 적용할 연산 목록과 선택적 메시지
     */
    EditScheduleResponse editSchedule(String command, List<ScheduleItemForEdit> todos, String apiKey);
}
