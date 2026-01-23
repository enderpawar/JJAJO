package com.jjajo.presentation.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class WeekOptionsResponse {
    private Integer weekNumber;
    private String weekTheme;         // 주차 테마
    private List<ResourceOption> resourceOptions; // 교재/강의 옵션들
    
    @Data
    @Builder
    public static class ResourceOption {
        private String optionId;
        private String type;          // "book", "course", "video"
        private String title;
        private String description;
        private String pros;          // 장점
        private String cons;          // 단점
        private String url;
        private String platform;
        private Boolean recommended;  // AI 추천 여부
    }
}
