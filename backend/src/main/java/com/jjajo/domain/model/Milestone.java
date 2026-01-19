package com.jjajo.domain.model;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

/**
 * 목표의 마일스톤
 */
@Data
@Builder
public class Milestone {
    private String id;
    private String goalId;
    private String title;
    private String description;
    private String targetDate;      // YYYY-MM-DD 형식
    private boolean completed;
    private String completedDate;  // YYYY-MM-DD 형식
    private int estimatedHours;
}
