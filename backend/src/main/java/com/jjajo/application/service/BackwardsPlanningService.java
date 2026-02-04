package com.jjajo.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jjajo.domain.model.Goal;
import com.jjajo.domain.model.ScheduleRequest;
import com.jjajo.domain.model.UserProfile;
import com.jjajo.infrastructure.gemini.GeminiChatAdapter;
import com.jjajo.presentation.dto.BackwardsPlanRequest;
import com.jjajo.presentation.dto.BackwardsPlanResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

/**
 * 데드라인 역계산 자동 분할 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BackwardsPlanningService {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final List<String> WEEKDAY_CODES = List.of("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN");

    private final GeminiChatAdapter geminiChatAdapter;
    private final GoalSchedulingService goalSchedulingService;
    private final ObjectMapper objectMapper;

    @Value("${agent.log.path:}")
    private String agentLogPath;

    /**
     * 역계산 계획 생성
     */
    public BackwardsPlanResponse generatePlan(BackwardsPlanRequest request, String apiKey) {
        // #region agent log
        agentLog("H1", "BackwardsPlanningService#generatePlan", "entry",
                String.format("{\"goalTextPresent\":%s,\"todos\":%d,\"timeSlots\":%d,\"daysOff\":%d}",
                        request.getGoalText() != null,
                        request.getTodos() != null ? request.getTodos().size() : 0,
                        request.getTimeSlotPreferences() != null ? request.getTimeSlotPreferences().size() : 0,
                        request.getDaysOff() != null ? request.getDaysOff().size() : 0));
        // #endregion

        ParsedGoalContext context = parseGoalContext(request, apiKey);

        Goal goal = Goal.builder()
                .id(UUID.randomUUID().toString())
                .title(context.title())
                .description(context.summary())
                .deadline(context.deadline().toString())
                .priority(Goal.GoalPriority.HIGH)
                .status(Goal.GoalStatus.NOT_STARTED)
                .estimatedHours(context.estimatedHours())
                .completedHours(0)
                .milestones(List.of())
                .category(Goal.GoalCategory.WORK)
                .build();

        UserProfile profile = buildUserProfile(context, request);
        List<ScheduleRequest> draftSchedules = goalSchedulingService.generateScheduleForGoal(goal, profile);
        AdjustmentResult adjustment = adjustForConflicts(
                draftSchedules,
                request.getTodos(),
                profile,
                request.getDaysOff()
        );

        // #region agent log
        agentLog("H2", "BackwardsPlanningService#generatePlan", "contextComputed",
                String.format("{\"deadline\":\"%s\",\"totalHours\":%d,\"dailyHours\":%d}",
                        context.deadline(), context.estimatedHours(), context.dailyHours()));
        // #endregion

        return buildResponse(adjustment.schedules(), context, request, adjustment.conflicts());
    }

    private ParsedGoalContext parseGoalContext(BackwardsPlanRequest request, String apiKey) {
        LocalDate today = LocalDate.now();
        Set<DayOfWeek> daysOff = toDayOfWeekSet(request.getDaysOff());
        int fromTimeSlots = Math.max(1, calculateDailyHours(request));
        int dailyHoursCap = (request.getPreferredDailyHours() != null && request.getPreferredDailyHours() > 0)
                ? Math.min(12, request.getPreferredDailyHours())
                : fromTimeSlots;
        int computedDailyHours = Math.max(1, dailyHoursCap);

        // 목표 상세 화면 등에서 이미 알고 있는 값(마감일/총시간)이 있으면 우선 사용한다.
        LocalDate fallbackDeadline = parseDate(request.getDeadline()).orElse(today.plusDays(5));
        int explicitTotalHours = request.getTotalHours() != null ? request.getTotalHours() : 0;
        int fallbackTotalHours = explicitTotalHours > 0
                ? explicitTotalHours
                : Math.max(computedDailyHours,
                computeTotalHours(today, fallbackDeadline, computedDailyHours, daysOff));

        ParsedGoalContext fallback = new ParsedGoalContext(
                sanitizeTitle(request.getGoalText()),
                fallbackDeadline,
                fallbackTotalHours,
                computedDailyHours,
                "자동 생성 계획입니다."
        );

        if (!StringUtils.hasText(apiKey)) {
            // #region agent log
            agentLog("H3", "BackwardsPlanningService#parseGoalContext", "noApiKey",
                    String.format("{\"fallbackDeadline\":\"%s\",\"explicitTotalHours\":%d}", fallbackDeadline, explicitTotalHours));
            // #endregion
            return fallback;
        }

        try {
            String aiPrompt = buildParsingPrompt(request.getGoalText(), today);
            String aiResponse = geminiChatAdapter.chat(aiPrompt, apiKey);
            JsonNode jsonNode = tryExtractJson(aiResponse);

            if (jsonNode == null) {
                // #region agent log
                agentLog("H3", "BackwardsPlanningService#parseGoalContext", "jsonMissing", "{\"reason\":\"nullJson\"}");
                // #endregion
                return fallback;
            }

            String title = jsonNode.path("title").asText(fallback.title());
            LocalDate deadline = parseDate(jsonNode.path("deadline").asText(null)).orElse(fallback.deadline());
            String summary = jsonNode.path("summary").asText(fallback.summary());
            int aiTotalHours = jsonNode.has("totalHours") ? jsonNode.get("totalHours").asInt(0) : 0;

            int totalHours;
            int dailyHours;
            // explicitTotalHours가 있으면 AI 결과보다 우선한다.
            int preferredTotalHours = explicitTotalHours > 0 ? explicitTotalHours : aiTotalHours;

            if (preferredTotalHours > 0) {
                totalHours = preferredTotalHours;
                int workingDays = countWorkingDays(today, deadline, daysOff);
                int dailyFromTotal = workingDays > 0 ? (int) Math.ceil((double) totalHours / workingDays) : totalHours;
                dailyHours = Math.min(computedDailyHours, Math.max(1, dailyFromTotal));
            } else {
                totalHours = Math.max(computedDailyHours,
                        computeTotalHours(today, deadline, computedDailyHours, daysOff));
                dailyHours = computedDailyHours;
            }

            // #region agent log
            agentLog("H3", "BackwardsPlanningService#parseGoalContext", "parsedFromAI",
                    String.format("{\"deadline\":\"%s\",\"totalHours\":%d,\"dailyHours\":%d,\"aiTotalHours\":%d}",
                            deadline, totalHours, dailyHours, aiTotalHours));
            // #endregion

            return new ParsedGoalContext(
                    sanitizeTitle(title),
                    deadline,
                    totalHours,
                    dailyHours,
                    summary
            );
        } catch (Exception ex) {
            log.warn("AI 역계산 파싱 실패 – fallback 사용: {}", ex.getMessage());
            // #region agent log
            agentLog("H3", "BackwardsPlanningService#parseGoalContext", "exception",
                    String.format("{\"message\":\"%s\"}", ex.getMessage().replace("\"", "'")));
            // #endregion
            return fallback;
        }
    }

    private String buildParsingPrompt(String goalText, LocalDate today) {
        return """
                오늘 날짜는 %s 입니다.
                사용자가 다음과 같은 목표를 입력했습니다:
                \"%s\"

                자연어에서 마감일(YYYY-MM-DD), 총 투자 시간, 간단한 요약을 추출하여 아래 JSON 형식으로만 응답하세요.
                {
                  "title": "15자 이내 제목",
                  "deadline": "YYYY-MM-DD",
                  "totalHours": 숫자,
                  "summary": "한 문장 요약"
                }
                규칙:
                - totalHours: 목표 문장에 "투자시간 N시간", "총 N시간", "N시간 투자", "소요시간 N시간" 등이 있으면 그 숫자만 반환. 없거나 애매하면 0.
                - totalHours는 목표 전체에 쓸 총 시간(시간 단위)이지, 하루에 쓸 시간이 아님.
                - 마감일을 파악하기 어렵다면 오늘 기준 약 5일 뒤 날짜를 deadline으로 반환하세요.
                """.formatted(today.format(DateTimeFormatter.ISO_DATE), goalText);
    }

    private JsonNode tryExtractJson(String aiResponse) {
        if (!StringUtils.hasText(aiResponse)) {
            return null;
        }
        String trimmed = aiResponse.trim();
        try {
            if (trimmed.startsWith("{")) {
                return objectMapper.readTree(trimmed);
            }
            int start = trimmed.indexOf('{');
            int end = trimmed.lastIndexOf('}');
            if (start >= 0 && end > start) {
                return objectMapper.readTree(trimmed.substring(start, end + 1));
            }
        } catch (Exception ignore) {
            log.debug("AI 응답 JSON 파싱 실패: {}", ignore.getMessage());
        }
        return null;
    }

    private java.util.Optional<LocalDate> parseDate(String raw) {
        if (!StringUtils.hasText(raw)) {
            return java.util.Optional.empty();
        }
        try {
            return java.util.Optional.of(LocalDate.parse(raw.trim()));
        } catch (Exception ignore) {
            return java.util.Optional.empty();
        }
    }

    private int calculateDailyHours(BackwardsPlanRequest request) {
        if (request.getTimeSlotPreferences() == null || request.getTimeSlotPreferences().isEmpty()) {
            return 2;
        }
        int totalMinutes = 0;
        for (BackwardsPlanRequest.TimeSlotPreference preference : request.getTimeSlotPreferences()) {
            if (!preference.isEnabled()) {
                continue;
            }
            int diff = Math.max(0, preference.getEndHour() - preference.getStartHour());
            totalMinutes += diff * 60;
        }
        if (totalMinutes <= 0) {
            return 2;
        }
        return Math.max(1, (int) Math.ceil(totalMinutes / 60.0));
    }

    private int computeTotalHours(LocalDate start, LocalDate deadline, int dailyHours, Set<DayOfWeek> daysOff) {
        if (dailyHours <= 0) {
            return 0;
        }
        if (!deadline.isAfter(start)) {
            deadline = start.plusDays(1);
        }
        int workingDays = countWorkingDays(start, deadline, daysOff);
        return Math.max(dailyHours, dailyHours * workingDays);
    }

    private int countWorkingDays(LocalDate start, LocalDate end, Set<DayOfWeek> daysOff) {
        if (!end.isAfter(start)) {
            return 1;
        }
        int count = 0;
        LocalDate cursor = start;
        int guard = 0;
        while (!cursor.isAfter(end) && guard < 400) {
            if (!daysOff.contains(cursor.getDayOfWeek())) {
                count++;
            }
            cursor = cursor.plusDays(1);
            guard++;
        }
        return Math.max(1, count);
    }

    private Set<DayOfWeek> toDayOfWeekSet(List<String> daysOffCodes) {
        Set<DayOfWeek> set = new HashSet<>();
        if (daysOffCodes == null) {
            return set;
        }
        for (String code : daysOffCodes) {
            DayOfWeek dow = parseDayCode(code);
            if (dow != null) {
                set.add(dow);
            }
        }
        return set;
    }

    private DayOfWeek parseDayCode(String code) {
        if (!StringUtils.hasText(code)) {
            return null;
        }
        return switch (code.toUpperCase(Locale.ROOT)) {
            case "MON" -> DayOfWeek.MONDAY;
            case "TUE" -> DayOfWeek.TUESDAY;
            case "WED" -> DayOfWeek.WEDNESDAY;
            case "THU" -> DayOfWeek.THURSDAY;
            case "FRI" -> DayOfWeek.FRIDAY;
            case "SAT" -> DayOfWeek.SATURDAY;
            case "SUN" -> DayOfWeek.SUNDAY;
            default -> null;
        };
    }

    private List<String> computeAllowedDayCodes(List<String> daysOffCodes) {
        Set<String> off = new HashSet<>();
        if (daysOffCodes != null) {
            for (String code : daysOffCodes) {
                if (StringUtils.hasText(code)) {
                    off.add(code.toUpperCase(Locale.ROOT));
                }
            }
        }
        List<String> allowed = new ArrayList<>();
        for (String code : WEEKDAY_CODES) {
            if (!off.contains(code)) {
                allowed.add(code);
            }
        }
        if (allowed.isEmpty()) {
            allowed.addAll(List.of("MON", "TUE", "WED", "THU", "FRI"));
        }
        return allowed;
    }

    private LocalTime parseTimeOrDefault(String raw, LocalTime defaultValue) {
        if (!StringUtils.hasText(raw)) {
            return defaultValue;
        }
        try {
            return LocalTime.parse(raw);
        } catch (Exception ignore) {
            return defaultValue;
        }
    }

    private UserProfile buildUserProfile(ParsedGoalContext context, BackwardsPlanRequest request) {
        LocalTime start = parseTimeOrDefault(request.getWorkStartTime(), LocalTime.of(9, 0));
        LocalTime end = parseTimeOrDefault(request.getWorkEndTime(), LocalTime.of(21, 0));
        List<String> preferredDays = computeAllowedDayCodes(request.getDaysOff());
        boolean allowWeekend = preferredDays.stream().anyMatch(code -> code.equals("SAT") || code.equals("SUN"));
        int breakMinutes = request.getBreakDuration() != null ? Math.max(0, request.getBreakDuration()) : 10;
        int dailyHours = (request.getPreferredDailyHours() != null && request.getPreferredDailyHours() > 0)
                ? Math.min(12, request.getPreferredDailyHours())
                : context.dailyHours();

        return UserProfile.builder()
                .userId("planner-" + ThreadLocalRandom.current().nextInt(1000))
                .name("사용자")
                .preferences(UserProfile.UserPreferences.builder()
                        .workStartTime(start)
                        .workEndTime(end)
                        .preferredWorkHoursPerDay(dailyHours)
                        .preferredBreakMinutes(breakMinutes)
                        .preferredWorkDays(preferredDays)
                        .allowWeekendWork(allowWeekend)
                        .minimumSleepHours(7)
                        .preferredSleepTime(LocalTime.of(0, 30))
                        .preferredWakeupTime(LocalTime.of(7, 30))
                        .build())
                .build();
    }

    private AdjustmentResult adjustForConflicts(
            List<ScheduleRequest> schedules,
            List<BackwardsPlanRequest.TodoSummary> todos,
            UserProfile profile,
            List<String> daysOffCodes
    ) {
        if (schedules == null || schedules.isEmpty()) {
            return new AdjustmentResult(List.of(), List.of());
        }

        Map<String, List<TimeBlock>> occupied = buildOccupiedMap(todos);
        List<ScheduleRequest> adjusted = new ArrayList<>();
        List<BackwardsPlanResponse.Conflict> conflicts = new ArrayList<>();

        LocalTime workStart = profile.getPreferences().getWorkStartTime() != null
                ? profile.getPreferences().getWorkStartTime()
                : LocalTime.of(9, 0);
        LocalTime workEnd = profile.getPreferences().getWorkEndTime() != null
                ? profile.getPreferences().getWorkEndTime()
                : LocalTime.of(21, 0);
        Set<DayOfWeek> daysOff = toDayOfWeekSet(daysOffCodes);

        for (ScheduleRequest schedule : schedules) {
            if (schedule.getDate() == null || schedule.getStartTime() == null || schedule.getEndTime() == null) {
                adjusted.add(schedule);
                continue;
            }

            LocalDate date = LocalDate.parse(schedule.getDate());
            LocalTime start = LocalTime.parse(schedule.getStartTime());
            LocalTime end = LocalTime.parse(schedule.getEndTime());

            TimeBlock candidate = new TimeBlock(date, start, end);
            long durationMinutes = Math.max(30, ChronoUnit.MINUTES.between(start, end));
            candidate = alignToWorkingDay(candidate, daysOff, workStart, durationMinutes);
            boolean moved = false;
            int guard = 0;

            while ((isDayOff(candidate.date(), daysOff) || hasConflict(candidate, occupied)) && guard < 200) {
                candidate = candidate.shift(workStart, workEnd, durationMinutes, daysOff);
                moved = true;
                guard++;
            }

            if (guard >= 200) {
                conflicts.add(BackwardsPlanResponse.Conflict.builder()
                        .date(schedule.getDate())
                        .reason("충돌을 해결하지 못했습니다.")
                        .resolvedTo("미배치")
                        .build());
                // #region agent log
                agentLog("H2", "BackwardsPlanningService#adjustForConflicts", "unresolvedConflict",
                        String.format("{\"originalDate\":\"%s\"}", schedule.getDate()));
                // #endregion
                continue;
            }

            occupied.computeIfAbsent(candidate.date().toString(), key -> new ArrayList<>()).add(candidate);

            ScheduleRequest adjustedSchedule = ScheduleRequest.builder()
                    .title(schedule.getTitle())
                    .description(schedule.getDescription())
                    .date(candidate.date().toString())
                    .startTime(candidate.start().format(TIME_FORMATTER))
                    .endTime(candidate.end().format(TIME_FORMATTER))
                    .priority(schedule.getPriority())
                    .build();

            adjusted.add(adjustedSchedule);

            if (moved) {
                conflicts.add(BackwardsPlanResponse.Conflict.builder()
                        .date(schedule.getDate())
                        .reason("기존 일정과 충돌하여 시간 변경")
                        .resolvedTo(candidate.date() + " " + candidate.start().format(TIME_FORMATTER))
                        .build());
                // #region agent log
                agentLog("H2", "BackwardsPlanningService#adjustForConflicts", "movedSchedule",
                        String.format("{\"newDate\":\"%s\",\"newStart\":\"%s\"}",
                                candidate.date(), candidate.start()));
                // #endregion
            }
        }

        return new AdjustmentResult(adjusted, conflicts);
    }

    private boolean isDayOff(LocalDate date, Set<DayOfWeek> daysOff) {
        return daysOff.contains(date.getDayOfWeek());
    }

    private TimeBlock alignToWorkingDay(TimeBlock block, Set<DayOfWeek> daysOff, LocalTime workStart, long durationMinutes) {
        if (!isDayOff(block.date(), daysOff)) {
            return block;
        }
        TimeBlock next = block.moveToNextDay(workStart, durationMinutes, daysOff);
        return alignToWorkingDay(next, daysOff, workStart, durationMinutes);
    }

    private Map<String, List<TimeBlock>> buildOccupiedMap(List<BackwardsPlanRequest.TodoSummary> todos) {
        Map<String, List<TimeBlock>> occupied = new HashMap<>();

        if (todos == null) {
            return occupied;
        }

        for (BackwardsPlanRequest.TodoSummary todo : todos) {
            if (!StringUtils.hasText(todo.getDate()) || !StringUtils.hasText(todo.getStartTime()) || !StringUtils.hasText(todo.getEndTime())) {
                continue;
            }
            try {
                LocalDate date = LocalDate.parse(todo.getDate());
                LocalTime start = LocalTime.parse(todo.getStartTime());
                LocalTime end = LocalTime.parse(todo.getEndTime());
                occupied.computeIfAbsent(todo.getDate(), key -> new ArrayList<>())
                        .add(new TimeBlock(date, start, end));
            } catch (Exception ignore) {
                log.debug("기존 일정 파싱 실패: {}", ignore.getMessage());
            }
        }
        return occupied;
    }

    private boolean hasConflict(TimeBlock candidate, Map<String, List<TimeBlock>> occupied) {
        List<TimeBlock> dayBlocks = occupied.get(candidate.date().toString());
        if (dayBlocks == null) {
            return false;
        }
        for (TimeBlock block : dayBlocks) {
            if (candidate.overlaps(block)) {
                return true;
            }
        }
        return false;
    }

    private BackwardsPlanResponse buildResponse(
            List<ScheduleRequest> schedules,
            ParsedGoalContext context,
            BackwardsPlanRequest request,
            List<BackwardsPlanResponse.Conflict> conflicts
    ) {
        if (schedules == null || schedules.isEmpty()) {
            return BackwardsPlanResponse.emptyFallback();
        }

        Map<String, List<BackwardsPlanResponse.PlanBlock>> grouped = new LinkedHashMap<>();
        double totalPlannedHours = 0;
        for (ScheduleRequest schedule : schedules) {
            if (schedule.getDate() == null) continue;
            double blockHours = durationHours(schedule.getStartTime(), schedule.getEndTime());
            totalPlannedHours += blockHours;
            grouped.computeIfAbsent(schedule.getDate(), key -> new ArrayList<>())
                    .add(BackwardsPlanResponse.PlanBlock.builder()
                            .title(schedule.getTitle())
                            .description(schedule.getDescription())
                            .startTime(schedule.getStartTime())
                            .endTime(schedule.getEndTime())
                            .priority(schedule.getPriority())
                            .build());
        }

        List<BackwardsPlanResponse.PlanDay> planDays = new ArrayList<>();
        int maxHoursPerDay = 0;
        for (Map.Entry<String, List<BackwardsPlanResponse.PlanBlock>> entry : grouped.entrySet()) {
            double hours = entry.getValue().stream()
                    .mapToDouble(block -> durationHours(block.getStartTime(), block.getEndTime()))
                    .sum();
            maxHoursPerDay = Math.max(maxHoursPerDay, (int) Math.round(hours));
            planDays.add(BackwardsPlanResponse.PlanDay.builder()
                    .date(entry.getKey())
                    .plannedHours(hours)
                    .blocks(entry.getValue())
                    .build());
        }

        int daysRemaining = Math.max(0, (int) ChronoUnit.DAYS.between(LocalDate.now(), context.deadline()));
        int responseTotalHours = (int) Math.round(totalPlannedHours);
        int responseDailyHours = (request.getPreferredDailyHours() != null && request.getPreferredDailyHours() > 0)
                ? Math.min(12, request.getPreferredDailyHours())
                : Math.max(1, maxHoursPerDay > 0 ? maxHoursPerDay : context.dailyHours());
        String summary = "마감까지 %d일 남음 · 총 %d시간 · 하루 약 %d시간".formatted(
                daysRemaining,
                responseTotalHours,
                responseDailyHours);

        return BackwardsPlanResponse.builder()
                .summary(summary)
                .daysRemaining(daysRemaining)
                .totalHours(responseTotalHours)
                .recommendedDailyHours(responseDailyHours)
                .planDays(planDays)
                .conflicts(conflicts)
                .build();
    }

    private double durationHours(String start, String end) {
        if (!StringUtils.hasText(start) || !StringUtils.hasText(end)) {
            return 0;
        }
        try {
            LocalTime s = LocalTime.parse(start);
            LocalTime e = LocalTime.parse(end);
            return ChronoUnit.MINUTES.between(s, e) / 60.0;
        } catch (Exception ignore) {
            return 0;
        }
    }

    private String sanitizeTitle(String goalText) {
        if (!StringUtils.hasText(goalText)) {
            return "새로운 목표";
        }
        return goalText.length() > 30 ? goalText.substring(0, 30) : goalText;
    }

    private record ParsedGoalContext(String title, LocalDate deadline, int estimatedHours, int dailyHours, String summary) {
    }

    private record AdjustmentResult(List<ScheduleRequest> schedules, List<BackwardsPlanResponse.Conflict> conflicts) {
    }

    private record TimeBlock(LocalDate date, LocalTime start, LocalTime end) {
        private boolean overlaps(TimeBlock other) {
            return !start.isAfter(other.end) && !end.isBefore(other.start);
        }

        private TimeBlock shift(LocalTime workStart, LocalTime workEnd, long durationMinutes, Set<DayOfWeek> daysOff) {
            LocalDate newDate = date;
            LocalTime newStart = start.plusMinutes(30);
            LocalTime newEnd = newStart.plusMinutes(durationMinutes);

            if (newEnd.isAfter(workEnd) || !newEnd.isAfter(newStart) || daysOff.contains(newDate.getDayOfWeek())) {
                return moveToNextDay(workStart, durationMinutes, daysOff);
            }

            return new TimeBlock(newDate, newStart, newEnd);
        }

        private TimeBlock moveToNextDay(LocalTime workStart, long durationMinutes, Set<DayOfWeek> daysOff) {
            LocalDate newDate = date.plusDays(1);
            int guard = 0;
            while (daysOff.contains(newDate.getDayOfWeek()) && guard < 14) {
                newDate = newDate.plusDays(1);
                guard++;
            }
            LocalTime newStart = workStart;
            LocalTime newEnd = workStart.plusMinutes(durationMinutes);
            return new TimeBlock(newDate, newStart, newEnd);
        }
    }

    // #region agent log
    private void agentLog(String hypothesisId, String location, String message, String dataJson) {
        try {
            String payload = String.format("{\"sessionId\":\"debug-session\",\"runId\":\"pre-fix\",\"hypothesisId\":\"%s\",\"location\":\"%s\",\"message\":\"%s\",\"data\":%s,\"timestamp\":%d}%n",
                    hypothesisId, location, message, dataJson, System.currentTimeMillis());

            if (!StringUtils.hasText(agentLogPath)) {
                log.debug("agentLog skipped (no path configured): hypothesisId={}, location={}, message={}, data={}",
                        hypothesisId, location, message, dataJson);
                return;
            }

            Path path = Path.of(agentLogPath);
            Path parent = path.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            Files.writeString(path, payload, StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (Exception ignored) {
        }
    }
    // #endregion
}
