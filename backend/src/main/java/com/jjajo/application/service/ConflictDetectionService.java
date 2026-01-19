package com.jjajo.application.service;

import com.jjajo.domain.model.ScheduleConflict;
import com.jjajo.domain.model.ScheduleRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * 일정 충돌 감지 서비스
 */
@Slf4j
@Service
public class ConflictDetectionService {
    
    /**
     * 새 일정과 기존 일정들 간의 충돌 감지
     */
    public List<ScheduleConflict> detectConflicts(
            ScheduleRequest newSchedule, 
            List<ScheduleRequest> existingSchedules) {
        
        List<ScheduleConflict> conflicts = new ArrayList<>();
        
        LocalDateTime newStart = combineDateTime(newSchedule.getDateAsLocalDate(), newSchedule.getStartTimeAsLocalTime());
        LocalDateTime newEnd = combineDateTime(newSchedule.getDateAsLocalDate(), newSchedule.getEndTimeAsLocalTime());
        
        for (ScheduleRequest existing : existingSchedules) {
            LocalDateTime existingStart = combineDateTime(existing.getDateAsLocalDate(), existing.getStartTimeAsLocalTime());
            LocalDateTime existingEnd = combineDateTime(existing.getDateAsLocalDate(), existing.getEndTimeAsLocalTime());
            
            // 시간 겹침 확인
            if (isTimeOverlapping(newStart, newEnd, existingStart, existingEnd)) {
                ScheduleConflict conflict = createConflict(
                    newSchedule, 
                    existing, 
                    ScheduleConflict.ConflictSeverity.CRITICAL,
                    "일정이 완전히 겹칩니다."
                );
                conflicts.add(conflict);
            }
            // 이동 시간 부족 확인 (30분 버퍼)
            else if (isInsufficientTransitionTime(newStart, newEnd, existingStart, existingEnd, 30)) {
                ScheduleConflict conflict = createConflict(
                    newSchedule, 
                    existing, 
                    ScheduleConflict.ConflictSeverity.HIGH,
                    "일정 간 이동 시간이 부족합니다. (최소 30분 권장)"
                );
                conflicts.add(conflict);
            }
            // 준비 시간 부족 확인 (15분 버퍼)
            else if (isInsufficientTransitionTime(newStart, newEnd, existingStart, existingEnd, 15)) {
                ScheduleConflict conflict = createConflict(
                    newSchedule, 
                    existing, 
                    ScheduleConflict.ConflictSeverity.MEDIUM,
                    "일정 간 준비 시간이 부족할 수 있습니다."
                );
                conflicts.add(conflict);
            }
        }
        
        return conflicts;
    }
    
    /**
     * 시간 겹침 확인
     */
    private boolean isTimeOverlapping(
            LocalDateTime start1, LocalDateTime end1,
            LocalDateTime start2, LocalDateTime end2) {
        return start1.isBefore(end2) && end1.isAfter(start2);
    }
    
    /**
     * 전환 시간 부족 확인
     */
    private boolean isInsufficientTransitionTime(
            LocalDateTime start1, LocalDateTime end1,
            LocalDateTime start2, LocalDateTime end2,
            int requiredMinutes) {
        
        long minutesBetween;
        
        if (end1.isBefore(start2)) {
            minutesBetween = Duration.between(end1, start2).toMinutes();
        } else if (end2.isBefore(start1)) {
            minutesBetween = Duration.between(end2, start1).toMinutes();
        } else {
            return false; // 겹치는 경우는 별도 처리
        }
        
        return minutesBetween < requiredMinutes;
    }
    
    /**
     * 충돌 객체 생성
     */
    private ScheduleConflict createConflict(
            ScheduleRequest schedule1,
            ScheduleRequest schedule2,
            ScheduleConflict.ConflictSeverity severity,
            String description) {
        
        List<ScheduleRequest> conflictingSchedules = List.of(schedule1, schedule2);
        List<ScheduleConflict.ConflictResolution> resolutions = generateResolutions(schedule1, schedule2);
        
        return ScheduleConflict.builder()
                .conflictId(UUID.randomUUID().toString())
                .conflictingSchedules(conflictingSchedules)
                .severity(severity)
                .description(description)
                .resolutions(resolutions)
                .build();
    }
    
    /**
     * 해결 방안 생성
     */
    private List<ScheduleConflict.ConflictResolution> generateResolutions(
            ScheduleRequest schedule1,
            ScheduleRequest schedule2) {
        
        List<ScheduleConflict.ConflictResolution> resolutions = new ArrayList<>();
        
        // 해결안 1: 첫 번째 일정 시간 변경
        resolutions.add(ScheduleConflict.ConflictResolution.builder()
                .resolutionId(UUID.randomUUID().toString())
                .type(ScheduleConflict.ConflictResolution.ResolutionType.RESCHEDULE)
                .description(String.format("'%s' 일정을 다른 시간으로 변경", schedule1.getTitle()))
                .adjustments(List.of())
                .build());
        
        // 해결안 2: 두 번째 일정 시간 변경
        resolutions.add(ScheduleConflict.ConflictResolution.builder()
                .resolutionId(UUID.randomUUID().toString())
                .type(ScheduleConflict.ConflictResolution.ResolutionType.RESCHEDULE)
                .description(String.format("'%s' 일정을 다른 시간으로 변경", schedule2.getTitle()))
                .adjustments(List.of())
                .build());
        
        // 해결안 3: 시간 단축
        resolutions.add(ScheduleConflict.ConflictResolution.builder()
                .resolutionId(UUID.randomUUID().toString())
                .type(ScheduleConflict.ConflictResolution.ResolutionType.REDUCE_TIME)
                .description("일정 시간을 단축하여 조정")
                .adjustments(List.of())
                .build());
        
        return resolutions;
    }
    
    /**
     * 날짜와 시간 결합
     */
    private LocalDateTime combineDateTime(LocalDate date, LocalTime time) {
        if (date == null) {
            return LocalDateTime.now();
        }
        if (time == null) {
            return date.atStartOfDay();
        }
        return LocalDateTime.of(date, time);
    }
}
