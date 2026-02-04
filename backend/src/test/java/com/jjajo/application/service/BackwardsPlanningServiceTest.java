package com.jjajo.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jjajo.infrastructure.gemini.GeminiChatAdapter;
import com.jjajo.presentation.dto.BackwardsPlanRequest;
import com.jjajo.presentation.dto.BackwardsPlanResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("BackwardsPlanningService 테스트")
class BackwardsPlanningServiceTest {

    @Mock
    private GeminiChatAdapter geminiChatAdapter;

    private GoalSchedulingService goalSchedulingService;

    private BackwardsPlanningService backwardsPlanningService;

    @BeforeEach
    void setUp() {
        goalSchedulingService = new GoalSchedulingService();
        backwardsPlanningService = new BackwardsPlanningService(
                geminiChatAdapter,
                goalSchedulingService,
                new ObjectMapper()
        );
    }

    @Test
    @DisplayName("AI 응답 기반 계획 생성")
    void generatePlanWithAiResponse() {
        LocalDate deadline = LocalDate.now().plusDays(5);
        when(geminiChatAdapter.chat(anyString(), anyString()))
                .thenReturn("""
                        {
                          "title": "백엔드 프로젝트",
                          "deadline": "%s",
                          "summary": "5일 안에 마무리합시다"
                        }
                        """.formatted(deadline));

        BackwardsPlanRequest request = createBaseRequest("다음 주 수요일까지 백엔드 프로젝트 완성");

        BackwardsPlanResponse response = backwardsPlanningService.generatePlan(request, "api-key");

        assertThat(response.getPlanDays()).isNotEmpty();
        assertThat(response.getSummary()).contains("마감까지");
        assertThat(response.getTotalHours()).isGreaterThan(0);
    }

    @Test
    @DisplayName("기존 일정 충돌 시 시간 이동 처리")
    void adjustSchedulesWithConflicts() {
        LocalDate deadline = LocalDate.now().plusDays(3);
        when(geminiChatAdapter.chat(anyString(), anyString()))
                .thenReturn("""
                        {
                          "title": "API 개선 작업",
                          "deadline": "%s",
                          "summary": "짧은 기간 동안 집중 작업"
                        }
                        """.formatted(deadline));

        BackwardsPlanRequest.TodoSummary existing = new BackwardsPlanRequest.TodoSummary();
        existing.setTitle("기존 회의");
        existing.setDate(LocalDate.now().toString());
        existing.setStartTime("09:00");
        existing.setEndTime("11:00");

        BackwardsPlanRequest request = createBaseRequest("API 개선");
        request.setTodos(List.of(existing));

        BackwardsPlanResponse response = backwardsPlanningService.generatePlan(request, "api-key");

        assertThat(response.getConflicts()).isNotEmpty();
        assertThat(response.getPlanDays()).isNotEmpty();
    }

    private BackwardsPlanRequest createBaseRequest(String goal) {
        BackwardsPlanRequest request = new BackwardsPlanRequest();
        request.setGoalText(goal);
        request.setWorkStartTime("09:00");
        request.setWorkEndTime("18:00");
        request.setBreakDuration(15);
        request.setDaysOff(List.of("SAT", "SUN"));

        BackwardsPlanRequest.TimeSlotPreference morning = new BackwardsPlanRequest.TimeSlotPreference();
        morning.setPeriod("morning");
        morning.setStartHour(9);
        morning.setEndHour(12);
        morning.setPriority(1);
        morning.setEnabled(true);

        BackwardsPlanRequest.TimeSlotPreference afternoon = new BackwardsPlanRequest.TimeSlotPreference();
        afternoon.setPeriod("afternoon");
        afternoon.setStartHour(13);
        afternoon.setEndHour(17);
        afternoon.setPriority(2);
        afternoon.setEnabled(true);

        request.setTimeSlotPreferences(List.of(morning, afternoon));
        return request;
    }
}
