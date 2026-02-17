package com.jjajo.presentation.controller;

import com.jjajo.application.service.ScheduleService;
import com.jjajo.infrastructure.gemini.GeminiTimetableAdapter;
import com.jjajo.presentation.config.SecurityConfig;
import com.jjajo.presentation.dto.FixedScheduleCandidate;
import com.jjajo.presentation.dto.FixedScheduleSaveRequest;
import com.jjajo.presentation.dto.ScheduleCreateRequest;
import com.jjajo.presentation.dto.ScheduleItemResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * 시간표 이미지 → 고정 일정 등록용 API.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/timetables")
@RequiredArgsConstructor
public class TimetableController {

    private final GeminiTimetableAdapter geminiTimetableAdapter;
    private final ScheduleService scheduleService;

    /**
     * 시간표 이미지 업로드 + Gemini Vision 파싱.
     *
     * 인증은 필요 없고, Gemini API 키를 헤더로 받는다.
     */
    @PostMapping("/parse")
    public ResponseEntity<?> parseTimetableImage(
            @RequestPart("image") MultipartFile image,
            @RequestParam(name = "language", required = false) String language,
            @RequestParam(name = "weekStartDay", required = false) String weekStartDay,
            @RequestHeader("X-Gemini-API-Key") String apiKey
    ) {
        try {
            if (image == null || image.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "시간표 이미지 파일을 업로드해주세요."));
            }

            byte[] bytes = image.getBytes();
            String mimeType = image.getContentType();
            List<FixedScheduleCandidate> candidates = geminiTimetableAdapter.parseTimetable(bytes, mimeType, apiKey, language, weekStartDay);
            return ResponseEntity.ok(candidates);
        } catch (Exception e) {
            log.error("시간표 이미지 파싱 실패", e);
            return ResponseEntity.badRequest().body(Map.of("message", "시간표 이미지를 해석하는 중 오류가 발생했습니다. 다른 이미지로 다시 시도해주세요."));
        }
    }

    /**
     * 파싱된 고정 일정 후보를 실제 주간 반복 일정으로 저장.
     *
     * - 학기 시작/종강일 범위 안에서 dayOfWeek에 맞는 날짜에 일정들을 생성한다.
     * - 각 생성 건은 일반 Schedule로 저장되어 기존 캘린더에서 그대로 보인다.
     */
    @PostMapping("/fixed-schedules")
    public ResponseEntity<?> saveFixedSchedules(
            @Valid @RequestBody FixedScheduleSaveRequest request,
            Authentication authentication
    ) {
        String userId = SecurityConfig.extractUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        LocalDate startDate;
        LocalDate endDate;
        try {
            startDate = LocalDate.parse(request.getStartDate());
            endDate = LocalDate.parse(request.getEndDate());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "startDate와 endDate는 YYYY-MM-DD 형식이어야 합니다."));
        }

        if (endDate.isBefore(startDate)) {
            return ResponseEntity.badRequest().body(Map.of("message", "종료일은 시작일보다 빠를 수 없습니다."));
        }

        List<FixedScheduleCandidate> items = request.getItems();
        if (items == null || items.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "저장할 일정이 없습니다."));
        }

        List<ScheduleItemResponse> created = new ArrayList<>();

        for (FixedScheduleCandidate candidate : items) {
            if (candidate == null) continue;
            DayOfWeek dayOfWeek = toDayOfWeek(candidate.getDayOfWeek());
            if (dayOfWeek == null) {
                log.debug("알 수 없는 dayOfWeek={}, title={}", candidate.getDayOfWeek(), candidate.getTitle());
                continue;
            }
            if (candidate.getTitle() == null || candidate.getTitle().isBlank()) {
                continue;
            }

            LocalDate cursor = startDate;
            while (!cursor.isAfter(endDate)) {
                if (cursor.getDayOfWeek() == dayOfWeek) {
                    ScheduleCreateRequest createRequest = ScheduleCreateRequest.builder()
                            .title(candidate.getTitle())
                            .description(candidate.getLocation() != null && !candidate.getLocation().isBlank()
                                    ? candidate.getLocation()
                                    : candidate.getNotes())
                            .date(cursor.toString())
                            .startTime(candidate.getStartTime())
                            .endTime(candidate.getEndTime())
                            .status("pending")
                            .priority("medium")
                            .createdBy("user")
                            .build();

                    ScheduleItemResponse saved = scheduleService.create(userId, createRequest);
                    created.add(saved);
                }
                cursor = cursor.plusDays(1);
            }
        }

        return ResponseEntity.ok(created);
    }

    private DayOfWeek toDayOfWeek(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String upper = raw.trim().toUpperCase(Locale.ROOT);

        // 이미 MON~SUN 형식인 경우
        switch (upper) {
            case "MON":
            case "MONDAY":
            case "월":
                return DayOfWeek.MONDAY;
            case "TUE":
            case "TUES":
            case "TUESDAY":
            case "화":
                return DayOfWeek.TUESDAY;
            case "WED":
            case "WEDNESDAY":
            case "수":
                return DayOfWeek.WEDNESDAY;
            case "THU":
            case "THUR":
            case "THURSDAY":
            case "목":
                return DayOfWeek.THURSDAY;
            case "FRI":
            case "FRIDAY":
            case "금":
                return DayOfWeek.FRIDAY;
            case "SAT":
            case "SATURDAY":
            case "토":
                return DayOfWeek.SATURDAY;
            case "SUN":
            case "SUNDAY":
            case "일":
                return DayOfWeek.SUNDAY;
            default:
                return null;
        }
    }
}

