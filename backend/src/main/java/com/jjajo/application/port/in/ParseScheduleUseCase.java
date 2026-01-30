package com.jjajo.application.port.in;

import com.jjajo.presentation.dto.AiChatResponse;

/**
 * 매직 바(한 줄 자연어)로 일정 파싱 유스케이스
 */
public interface ParseScheduleUseCase {
    /**
     * 자연어 한 줄 명령을 파싱하여 일정 정보를 추출합니다.
     * 예: "내일 오후 3시부터 2시간 동안 팀 프로젝트 회의 추가해줘"
     *
     * @param command 사용자 한 줄 입력
     * @param apiKey  Gemini API 키
     * @return 추출된 일정 정보 (title, date, startTime, endTime 등)
     */
    AiChatResponse.ScheduleData parseSchedule(String command, String apiKey);
}
