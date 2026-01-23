package com.jjajo.presentation.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class GoalSummaryResponse {
    private String goalAnalysis;              // 목표 분석 텍스트
    private Integer estimatedWeeks;           // 예상 기간 (주)
    private String difficultyLevel;           // 난이도 (high/medium/low)
    private List<String> keyRecommendations;  // 핵심 권장사항
    private String motivationalMessage;       // 동기부여 메시지
    private String learningApproach;          // 추천 학습 방식
    private Integer estimatedHoursPerWeek;    // 주당 예상 학습 시간
}
