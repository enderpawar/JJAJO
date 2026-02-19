package com.jjajo.domain.model;

import java.util.List;
import java.util.Map;

/**
 * 루틴 카테고리별 선호 시간대 및 세션 최대 길이.
 * 짜조 플래너가 preferredSlots에 우선 배치하고, 고정 일정이 있으면 다음 가용 시간으로 배치.
 */
public final class RoutineTemplates {

    public static final Map<String, RoutineTemplate> TEMPLATES = Map.of(
            "study", new RoutineTemplate(List.of("09:00-12:00", "14:00-17:00"), 90),
            "workout", new RoutineTemplate(List.of("06:00-08:00", "18:00-20:00"), 60),
            "work", new RoutineTemplate(List.of("09:00-12:00", "14:00-18:00"), 120),
            "rest", new RoutineTemplate(List.of("12:00-14:00", "20:00-22:00"), 60),
            "default", new RoutineTemplate(List.of("09:00-18:00"), 60)
    );

    public record RoutineTemplate(List<String> preferredSlots, int sessionMaxMinutes) {
    }

    public static RoutineTemplate get(String category) {
        RoutineTemplate t = TEMPLATES.get(category != null ? category.toLowerCase() : null);
        return t != null ? t : TEMPLATES.get("default");
    }
}
