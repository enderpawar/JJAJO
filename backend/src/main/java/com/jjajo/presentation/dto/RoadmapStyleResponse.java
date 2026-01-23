package com.jjajo.presentation.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class RoadmapStyleResponse {
    private String styleId;           // "intensive", "solid", "practical"
    private String styleName;         // "속성 코스", "탄탄 기초 코스", "실전 중심 코스"
    private String description;       // 스타일 설명
    private String targetAudience;    // 대상자 (예: "빠르게 목표 달성을 원하는 분")
    private Integer totalWeeks;       // 총 주차
    private Integer weeklyHours;      // 주당 학습 시간
    private List<String> features;    // 특징들
    private String difficulty;        // "high", "medium", "low"
}
