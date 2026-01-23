package com.jjajo.presentation.dto;

import lombok.Data;

import java.util.Map;

@Data
public class RoadmapOptionsRequest {
    private String goalTitle;
    private String goalDescription;
    private Map<String, Object> answers;
}
