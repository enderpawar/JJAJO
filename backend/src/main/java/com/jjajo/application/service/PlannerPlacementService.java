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
     * plan에 category가 있으면 해당 카테고리의 루틴 사용(균형 모드); 없으면 전체 category 사용.
     */
    public List<PlannerScheduleResponse.PlanItem> placePlans(
            String category,
            List<PlanWithDuration> plans,
            List<PlannerScheduleRequest.TimeSlotDto> availableSlots,
            int currentTimeMinutes,
            boolean insertRestCards,
            Integer blockMaxMinutes,
            Integer breakMinutesDefault) {
        if (plans == null || plans.isEmpty() || availableSlots == null || availableSlots.isEmpty()) {
            return List.of();
        }

        var slots = toSlotList(availableSlots, currentTimeMinutes);
        if (slots.isEmpty()) return List.of();

        List<PlannerScheduleResponse.PlanItem> result = new ArrayList<>();
        for (PlanWithDuration plan : plans) {
            String effectiveCategory = (plan.category() != null && !plan.category().isBlank()) ? plan.category() : category;
            var routine = RoutineTemplates.get(effectiveCategory);
            var preferredRanges = parsePreferredRanges(routine.preferredSlots());
            // 전체 계획 소요 시간(분) – 최소 10분, 상한은 과도하게 길어지지 않도록 방어적으로 제한.
            int totalDuration = Math.max(plan.durationMinutes(), 10);
            totalDuration = Math.min(totalDuration, 480);

            // 한 블록 최대 길이(분): 요청 파라미터가 있으면 우선 사용, 없으면 루틴의 sessionMaxMinutes.
            int maxBlock = routine.sessionMaxMinutes();
            if (blockMaxMinutes != null && blockMaxMinutes > 0) {
                maxBlock = Math.min(maxBlock, blockMaxMinutes);
            }
            // 최소 블록 길이 보장
            maxBlock = Math.max(maxBlock, 10);

            Integer breakAfter = plan.breakMinutesAfter();
            int defaultBreak = breakMinutesDefault != null && breakMinutesDefault >= 0
                    ? breakMinutesDefault
                    : routine.breakMinutesDefault();
            int breakMin = Math.max(0, breakAfter == null ? defaultBreak : breakAfter);

            int remaining = totalDuration;
            int segmentIndex = 1;
            int segmentCount = (int) Math.ceil((double) totalDuration / maxBlock);

            while (remaining > 0 && !slots.isEmpty()) {
                int chunk = Math.min(remaining, maxBlock);
                var placed = placeOne(slots, preferredRanges, plan.title(), chunk);
                if (placed == null) {
                    break;
                }

                String title = plan.title();
                if (segmentCount > 1) {
                    title = plan.title() + " (" + segmentIndex + "/" + segmentCount + ")";
                }

                result.add(new PlannerScheduleResponse.PlanItem(title, placed.getStart(), placed.getEnd(), plan.note()));
                // 휴식 블록은 별도 일정 카드로 생성하지 않고, 다음 일정까지의 최소 휴식 시간만 슬롯에서 비워둔다.
                consumeSlot(slots, placed, breakMin);

                remaining -= chunk;
                segmentIndex++;
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

    /** 고도화: 블록 뒤 휴식(분). null이면 템플릿 기본값 사용. category가 있으면 균형 모드에서 해당 카테고리 루틴 사용. */
    public record PlanWithDuration(String title, int durationMinutes, Integer breakMinutesAfter, String note, String category) {
        public PlanWithDuration(String title, int durationMinutes) {
            this(title, durationMinutes, null, null, null);
        }
        public PlanWithDuration(String title, int durationMinutes, Integer breakMinutesAfter, String note) {
            this(title, durationMinutes, breakMinutesAfter, note, null);
        }
    }
}
