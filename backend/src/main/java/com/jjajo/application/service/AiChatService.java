package com.jjajo.application.service;

import com.jjajo.application.port.in.EditScheduleUseCase;
import com.jjajo.application.port.in.ParseScheduleUseCase;
import com.jjajo.application.port.in.PlannerScheduleUseCase;
import com.jjajo.infrastructure.gemini.GeminiChatAdapter;
import com.jjajo.presentation.dto.AiChatResponse;
import com.jjajo.presentation.dto.EditScheduleResponse;
import com.jjajo.presentation.dto.PlannerScheduleRequest;
import com.jjajo.presentation.dto.PlannerScheduleResponse;
import com.jjajo.presentation.dto.ScheduleItemForEdit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * AI 일정 서비스 - 매직 바 파싱, 짜조 플래너, 대화형 수정
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiChatService implements ParseScheduleUseCase, EditScheduleUseCase, PlannerScheduleUseCase {

    private final GeminiChatAdapter geminiChatAdapter;
    private final PlannerPlacementService plannerPlacementService;

    @Override
    public AiChatResponse.ScheduleData parseSchedule(String command, String apiKey) {
        log.info("매직 바 일정 파싱 요청: {}", command);
        ScheduleRequest schedule = geminiChatAdapter.parseScheduleWithFunctionCalling(command, apiKey);
        return AiChatResponse.ScheduleData.from(schedule);
    }

    @Override
    public PlannerScheduleResponse planSchedule(PlannerScheduleRequest request, String apiKey) {
        log.info("짜조 플래너 요청: {}", request.getUserText());
        var slots = request.getAvailableSlots() != null ? request.getAvailableSlots() : List.<PlannerScheduleRequest.TimeSlotDto>of();
        var categoryAndPlans = geminiChatAdapter.detectCategoryAndPlans(
                request.getUserText(), apiKey, request.getTemplateCategory());
        int currentTimeMinutes = parseTimeToMinutes(request.getCurrentTime());
        var plansWithDuration = categoryAndPlans.plans().stream()
                .map(p -> new PlannerPlacementService.PlanWithDuration(
                        p.title(), p.durationMinutes(), p.breakMinutesAfter(), p.note()))
                .toList();
        boolean fromTemplate = request.getTemplateCategory() != null && !request.getTemplateCategory().isBlank();
        var placed = plannerPlacementService.placePlans(
                categoryAndPlans.category(),
                plansWithDuration,
                slots,
                currentTimeMinutes,
                !fromTemplate); // 템플릿으로 생성 시 휴식 계획카드 미삽입
        return PlannerScheduleResponse.builder()
                .plans(placed)
                .summary(categoryAndPlans.summary())
                .build();
    }

    private static int parseTimeToMinutes(String time) {
        if (time == null || time.isBlank()) return 0;
        try {
            String[] p = time.trim().split(":");
            int h = p.length > 0 ? Integer.parseInt(p[0].trim()) : 0;
            int m = p.length > 1 ? Integer.parseInt(p[1].trim()) : 0;
            return h * 60 + m;
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    @Override
    public EditScheduleResponse editSchedule(String command, List<ScheduleItemForEdit> todos, String apiKey) {
        log.info("대화형 일정 수정 요청: {}", command);
        var operations = geminiChatAdapter.editScheduleWithFunctionCalling(command, todos, apiKey);
        String message = operations.isEmpty()
                ? "일정 내용을 이해하지 못했어요. 날짜·시간·제목을 명확히 적어주세요. (예: 내일 오후 3시 2시간 회의)"
                : null;
        return EditScheduleResponse.builder()
                .operations(operations)
                .message(message)
                .build();
    }
}
