package com.jjajo.application.service;

import com.jjajo.domain.model.RoutineTemplates;
import com.jjajo.presentation.dto.PlannerScheduleRequest;
import com.jjajo.presentation.dto.PlannerScheduleResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * preferredSlots 우선 배치 알고리즘.
 * 카테고리별 선호 시간대에 먼저 일정을 배치하고, 고정 일정으로 막혀 있으면 다음 가까운 가용 시간을 사용.
 */
@Slf4j
@Service
public class PlannerPlacementService {

    /**
     * Gemini가 반환한 plans(제목+소요분+휴식+메모)를 availableSlots에 배치.
     * preferredSlots 우선 배치. insertRestCards가 true일 때만 breakMinutesAfter에 따라 휴식 일정 자동 삽입.
     * 템플릿으로 일정 생성 시에는 휴식 계획카드를 넣지 않음(insertRestCards=false).
     */
    public List<PlannerScheduleResponse.PlanItem> placePlans(
            String category,
            List<PlanWithDuration> plans,
            List<PlannerScheduleRequest.TimeSlotDto> availableSlots,
            int currentTimeMinutes,
            boolean insertRestCards) {
        if (plans == null || plans.isEmpty() || availableSlots == null || availableSlots.isEmpty()) {
            return List.of();
        }

        var routine = RoutineTemplates.get(category);
        var preferredRanges = parsePreferredRanges(routine.preferredSlots());
        var slots = toSlotList(availableSlots, currentTimeMinutes);
        if (slots.isEmpty()) return List.of();

        List<PlannerScheduleResponse.PlanItem> result = new ArrayList<>();
        for (PlanWithDuration plan : plans) {
            int dur = Math.min(Math.max(plan.durationMinutes(), 10), routine.sessionMaxMinutes());
            Integer breakAfter = plan.breakMinutesAfter();
            int breakMin = Math.max(0, breakAfter == null ? routine.breakMinutesDefault() : breakAfter);
            var placed = placeOne(slots, preferredRanges, plan.title(), dur);
            if (placed != null) {
                result.add(new PlannerScheduleResponse.PlanItem(plan.title(), placed.getStart(), placed.getEnd(), plan.note()));
                if (insertRestCards && breakMin >= 5) {
                    consumeSlot(slots, placed, 0);
                    var restPlaced = placeOne(slots, preferredRanges, "휴식", breakMin);
                    if (restPlaced != null) {
                        result.add(new PlannerScheduleResponse.PlanItem("휴식", restPlaced.getStart(), restPlaced.getEnd(), null));
                        consumeSlot(slots, restPlaced, 0);
                    } else {
                        int endMin = timeToMinutes(placed.getEnd());
                        var breakRange = new PlannerScheduleResponse.PlanItem("", minutesToTime(endMin), minutesToTime(endMin + breakMin), null);
                        consumeSlot(slots, breakRange, 0);
                    }
                } else {
                    consumeSlot(slots, placed, breakMin);
                }
            }
        }
        return result;
    }

    private static int timeToMinutes(String time) {
        if (time == null || time.isBlank()) return 0;
        String[] p = time.split(":");
        int h = 0, m = 0;
        try {
            h = p.length > 0 ? Integer.parseInt(p[0].trim()) : 0;
            m = p.length > 1 ? Integer.parseInt(p[1].trim()) : 0;
        } catch (NumberFormatException e) {
            return 0;
        }
        return h * 60 + m;
    }

    private static String minutesToTime(int total) {
        int h = total / 60;
        int m = total % 60;
        return String.format("%02d:%02d", h, m);
    }

    private static List<int[]> parsePreferredRanges(List<String> preferredSlots) {
        List<int[]> out = new ArrayList<>();
        for (String s : preferredSlots) {
            String[] parts = s.split("-");
            if (parts.length >= 2) {
                int start = timeToMinutes(parts[0].trim());
                int end = timeToMinutes(parts[1].trim());
                if (end > start) out.add(new int[]{start, end});
            }
        }
        return out;
    }

    private static class Slot {
        int start;
        int end;

        Slot(int start, int end) {
            this.start = start;
            this.end = end;
        }

        int duration() {
            return end - start;
        }
    }

    private static List<Slot> toSlotList(List<PlannerScheduleRequest.TimeSlotDto> dtos, int currentTimeMinutes) {
        List<Slot> list = new ArrayList<>();
        for (var d : dtos) {
            if (d.getStart() == null || d.getEnd() == null) continue;
            if (d.getStart().isBlank() || d.getEnd().isBlank()) continue;
            int s = timeToMinutes(d.getStart());
            int e = timeToMinutes(d.getEnd());
            if (e <= s) continue;
            if (s < currentTimeMinutes) {
                s = currentTimeMinutes;
                if (e <= s) continue;
            }
            list.add(new Slot(s, e));
        }
        return list;
    }

    /** preferredRanges와의 겹침 정도를 점수로. 겹침이 클수록 높은 점수. */
    private static double scoreSlot(Slot slot, List<int[]> preferredRanges) {
        double score = 0;
        for (int[] pr : preferredRanges) {
            int overlapStart = Math.max(slot.start, pr[0]);
            int overlapEnd = Math.min(slot.end, pr[1]);
            if (overlapEnd > overlapStart) {
                score += (overlapEnd - overlapStart);
            }
        }
        if (score > 0) return score;
        int minDist = Integer.MAX_VALUE;
        for (int[] pr : preferredRanges) {
            int d = Math.min(Math.abs(slot.start - pr[1]), Math.abs(slot.end - pr[0]));
            minDist = Math.min(minDist, d);
        }
        return -minDist;
    }

    private static PlannerScheduleResponse.PlanItem placeOne(List<Slot> slots, List<int[]> preferredRanges, String title, int durationMinutes) {
        var sorted = slots.stream()
                .filter(s -> s.duration() >= durationMinutes)
                .sorted(Comparator.comparingDouble((Slot s) -> -scoreSlot(s, preferredRanges)).thenComparingInt(s -> s.start))
                .toList();
        if (sorted.isEmpty()) return null;
        Slot best = sorted.get(0);
        return new PlannerScheduleResponse.PlanItem(title, minutesToTime(best.start), minutesToTime(best.start + durationMinutes), null);
    }

    /** 배치된 일정만큼 슬롯을 소비. reserveMinutesAfter: 일정 종료 후 최소 휴식 텀(다음 일정은 이 시간 이후부터만 배치 가능). */
    private static void consumeSlot(List<Slot> slots, PlannerScheduleResponse.PlanItem placed, int reserveMinutesAfter) {
        int start = timeToMinutes(placed.getStart());
        int end = timeToMinutes(placed.getEnd());
        int nextAvailable = end + Math.max(0, reserveMinutesAfter);
        final int minSlotMinutes = 10;
        for (int i = 0; i < slots.size(); i++) {
            Slot s = slots.get(i);
            if (s.start <= start && s.end >= end) {
                slots.remove(i);
                boolean addedBefore = start - s.start >= minSlotMinutes;
                if (addedBefore) slots.add(i, new Slot(s.start, start));
                if (s.end - nextAvailable >= minSlotMinutes) slots.add(addedBefore ? i + 1 : i, new Slot(nextAvailable, s.end));
                return;
            }
        }
    }

    /** 고도화: 블록 뒤 휴식(분). null이면 템플릿 기본값 사용. 세부 메모(선택) */
    public record PlanWithDuration(String title, int durationMinutes, Integer breakMinutesAfter, String note) {
        public PlanWithDuration(String title, int durationMinutes) {
            this(title, durationMinutes, null, null);
        }
    }
}
