package com.jjajo.domain.model;

import java.util.List;
import java.util.Map;

/**
 * 루틴 카테고리별 선호 시간대, 세션 최대 길이, 기본 휴식 분.
 * 짜조 플래너가 preferredSlots에 우선 배치하고, 고정 일정이 있으면 다음 가용 시간으로 배치.
 * 고도화: 블록 뒤 기본 휴식(breakMinutesDefault)으로 균형 잡힌 계획 생성.
 */
public final class RoutineTemplates {

    public static final Map<String, RoutineTemplate> TEMPLATES = Map.of(
            "study", new RoutineTemplate(List.of("09:00-12:00", "14:00-17:00"), 90, 15),
            "workout", new RoutineTemplate(List.of("06:00-08:00", "18:00-20:00"), 60, 3),
            "work", new RoutineTemplate(List.of("09:00-12:00", "14:00-18:00"), 120, 10),
            "rest", new RoutineTemplate(List.of("12:00-14:00", "20:00-22:00"), 60, 0),
            "default", new RoutineTemplate(List.of("09:00-18:00"), 60, 10)
    );

    public record RoutineTemplate(List<String> preferredSlots, int sessionMaxMinutes, int breakMinutesDefault) {
        /** 하위 호환: breakMinutesDefault 0으로 생성 */
        public RoutineTemplate(List<String> preferredSlots, int sessionMaxMinutes) {
            this(preferredSlots, sessionMaxMinutes, 0);
        }
    }

    public static RoutineTemplate get(String category) {
        if (category == null) return TEMPLATES.get("default");
        String key = category.toLowerCase();
        if ("coding".equals(key)) key = "work";
        RoutineTemplate t = TEMPLATES.get(key);
        return t != null ? t : TEMPLATES.get("default");
    }
}
