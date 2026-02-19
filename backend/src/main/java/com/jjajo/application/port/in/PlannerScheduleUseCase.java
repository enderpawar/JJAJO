package com.jjajo.application.port.in;

import com.jjajo.presentation.dto.PlannerScheduleRequest;
import com.jjajo.presentation.dto.PlannerScheduleResponse;

/**
 * 짜조 플래너: 사용자 목표 + 가용 시간대 → 일정 분할 제안 (고스트 일정)
 */
public interface PlannerScheduleUseCase {

    PlannerScheduleResponse planSchedule(PlannerScheduleRequest request, String apiKey);
}
