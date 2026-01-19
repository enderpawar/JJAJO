package com.jjajo.application.service;

import com.jjajo.domain.model.Goal;
import com.jjajo.domain.model.Milestone;
import com.jjajo.domain.model.ScheduleRequest;
import com.jjajo.domain.model.UserProfile;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * 목표 기반 자동 일정 생성 서비스
 */
@Slf4j
@Service
public class GoalSchedulingService {
    
    /**
     * 목표를 위한 자동 일정 생성
     */
    public List<ScheduleRequest> generateScheduleForGoal(Goal goal, UserProfile profile) {
        log.info("목표 '{}' 에 대한 자동 일정 생성 시작", goal.getTitle());
        
        List<ScheduleRequest> schedules = new ArrayList<>();
        
        // 마일스톤이 있으면 마일스톤 기반, 없으면 목표 전체 기반
        if (goal.getMilestones() != null && !goal.getMilestones().isEmpty()) {
            schedules.addAll(generateSchedulesFromMilestones(goal, profile));
        } else {
            schedules.addAll(generateSchedulesFromGoal(goal, profile));
        }
        
        log.info("총 {} 개의 일정 생성 완료", schedules.size());
        return schedules;
    }
    
    /**
     * 마일스톤 기반 일정 생성
     */
    private List<ScheduleRequest> generateSchedulesFromMilestones(Goal goal, UserProfile profile) {
        List<ScheduleRequest> schedules = new ArrayList<>();
        
        for (Milestone milestone : goal.getMilestones()) {
            if (!milestone.isCompleted()) {
                List<ScheduleRequest> milestoneSchedules = generateSchedulesForMilestone(
                    goal, milestone, profile
                );
                schedules.addAll(milestoneSchedules);
            }
        }
        
        return schedules;
    }
    
    /**
     * 특정 마일스톤을 위한 일정 생성
     */
    private List<ScheduleRequest> generateSchedulesForMilestone(
            Goal goal, Milestone milestone, UserProfile profile) {
        
        List<ScheduleRequest> schedules = new ArrayList<>();
        
        LocalDate today = LocalDate.now();
        LocalDate targetDate = LocalDate.parse(milestone.getTargetDate());
        int remainingHours = milestone.getEstimatedHours();
        
        if (targetDate.isBefore(today)) {
            log.warn("마일스톤 '{}' 의 목표 날짜가 과거입니다.", milestone.getTitle());
            return schedules;
        }
        
        // 사용 가능한 작업 시간 계산 (주 5일, 하루 2시간 가정)
        int hoursPerSession = 2;
        int sessionsPerWeek = profile.getPreferences().getPreferredWorkDays().size();
        
        // 필요한 세션 수 계산
        int totalSessions = (int) Math.ceil((double) remainingHours / hoursPerSession);
        
        // 일정 분배
        LocalDate currentDate = today;
        int sessionCount = 0;
        
        while (sessionCount < totalSessions && !currentDate.isAfter(targetDate)) {
            DayOfWeek dayOfWeek = currentDate.getDayOfWeek();
            
            // 선호 작업 요일인지 확인
            if (isPreferredWorkDay(dayOfWeek, profile)) {
                LocalTime startTime = profile.getPreferences().getWorkStartTime() != null 
                    ? profile.getPreferences().getWorkStartTime() 
                    : LocalTime.of(9, 0);
                
                LocalTime endTime = startTime.plusHours(hoursPerSession);
                
                ScheduleRequest schedule = ScheduleRequest.builder()
                        .title(String.format("%s - %s", goal.getTitle(), milestone.getTitle()))
                        .description(String.format("목표 달성을 위한 작업 시간 (세션 %d/%d)", 
                            sessionCount + 1, totalSessions))
                        .date(currentDate.toString())
                        .startTime(startTime.toString())
                        .endTime(endTime.toString())
                        .priority(mapGoalPriorityToSchedulePriority(goal.getPriority()))
                        .build();
                
                schedules.add(schedule);
                sessionCount++;
            }
            
            currentDate = currentDate.plusDays(1);
        }
        
        return schedules;
    }
    
    /**
     * 목표 전체 기반 일정 생성 (마일스톤 없을 때)
     */
    private List<ScheduleRequest> generateSchedulesFromGoal(Goal goal, UserProfile profile) {
        List<ScheduleRequest> schedules = new ArrayList<>();
        
        LocalDate today = LocalDate.now();
        LocalDate deadline = LocalDate.parse(goal.getDeadline());
        int remainingHours = goal.getRemainingHours();
        
        log.debug("일정 생성 시작 - 목표: {}, 마감일: {}, 남은 시간: {}시간", goal.getTitle(), deadline, remainingHours);
        
        if (deadline.isBefore(today)) {
            log.warn("목표 '{}' 의 마감일이 과거입니다.", goal.getTitle());
            return schedules;
        }
        
        if (remainingHours <= 0) {
            log.warn("목표 '{}' 의 남은 시간이 0입니다.", goal.getTitle());
            return schedules;
        }
        
        // 남은 기간 계산
        long daysUntilDeadline = ChronoUnit.DAYS.between(today, deadline);
        
        // 하루 작업 시간 계산
        int preferredHoursPerDay = profile.getPreferences().getPreferredWorkHoursPerDay() > 0 
            ? profile.getPreferences().getPreferredWorkHoursPerDay() 
            : 2;
        
        int workDaysPerWeek = profile.getPreferences().getPreferredWorkDays() != null 
            ? profile.getPreferences().getPreferredWorkDays().size() 
            : 5;
        
        if (workDaysPerWeek == 0) {
            workDaysPerWeek = 5; // 기본값: 주 5일
        }
        
        long totalWorkDays = (daysUntilDeadline * workDaysPerWeek) / 7;
        
        if (totalWorkDays == 0) {
            totalWorkDays = 1;
        }
        
        int hoursPerSession = Math.min(
            (int) Math.ceil((double) remainingHours / totalWorkDays),
            preferredHoursPerDay
        );
        
        log.debug("일정 계산 - 마감일까지: {}일, 주{}일 작업, 총 작업일: {}일, 세션당 {}시간", 
            daysUntilDeadline, workDaysPerWeek, totalWorkDays, hoursPerSession);
        
        // 일정 생성
        LocalDate currentDate = today;
        int allocatedHours = 0;
        int sessionCount = 0;
        
        log.debug("일정 생성 루프 시작 - 목표 시간: {}시간", remainingHours);
        
        while (allocatedHours < remainingHours && !currentDate.isAfter(deadline)) {
            DayOfWeek dayOfWeek = currentDate.getDayOfWeek();
            
            if (isPreferredWorkDay(dayOfWeek, profile)) {
                LocalTime startTime = profile.getPreferences().getWorkStartTime() != null 
                    ? profile.getPreferences().getWorkStartTime() 
                    : LocalTime.of(9, 0);
                
                int sessionHours = Math.min(hoursPerSession, remainingHours - allocatedHours);
                LocalTime endTime = startTime.plusHours(sessionHours);
                
                ScheduleRequest schedule = ScheduleRequest.builder()
                        .title(goal.getTitle())
                        .description(String.format("목표 달성을 위한 작업 시간 (%d/%d 시간)", 
                            allocatedHours + sessionHours, goal.getEstimatedHours()))
                        .date(currentDate.toString())
                        .startTime(startTime.toString())
                        .endTime(endTime.toString())
                        .priority(mapGoalPriorityToSchedulePriority(goal.getPriority()))
                        .build();
                
                schedules.add(schedule);
                allocatedHours += sessionHours;
                sessionCount++;
                
                log.debug("일정 생성 - 날짜: {}, 시간: {}-{}, 누적: {}시간/{}{}", 
                    currentDate, startTime, endTime, allocatedHours, remainingHours, "시간");
            }
            
            currentDate = currentDate.plusDays(1);
        }
        
        log.debug("일정 생성 완료 - 총 {}개 일정, {}시간 할당", sessionCount, allocatedHours);
        
        return schedules;
    }
    
    /**
     * 선호 작업 요일 확인
     */
    private boolean isPreferredWorkDay(DayOfWeek dayOfWeek, UserProfile profile) {
        List<String> preferredDays = profile.getPreferences().getPreferredWorkDays();
        if (preferredDays == null || preferredDays.isEmpty()) {
            // 기본값: 월~금
            return dayOfWeek != DayOfWeek.SATURDAY && dayOfWeek != DayOfWeek.SUNDAY;
        }
        
        // DayOfWeek.MONDAY -> "MONDAY", "MON", "월요일" 모두 지원
        String dayName = dayOfWeek.name(); // "MONDAY"
        String dayShort = dayName.substring(0, 3); // "MON"
        
        return preferredDays.contains(dayName) || preferredDays.contains(dayShort);
    }
    
    /**
     * Goal Priority를 Schedule Priority로 변환
     */
    private String mapGoalPriorityToSchedulePriority(Goal.GoalPriority priority) {
        return switch (priority) {
            case HIGH -> "high";
            case MEDIUM -> "medium";
            case LOW -> "low";
        };
    }
}
