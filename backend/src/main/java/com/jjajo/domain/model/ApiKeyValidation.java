package com.jjajo.domain.model;

import lombok.Builder;
import lombok.Getter;

/**
 * API 키 유효성 검증 결과를 나타내는 도메인 모델
 */
@Getter
@Builder
public class ApiKeyValidation {
    private final boolean valid;
    private final String message;
    private final String modelInfo;
    
    public static ApiKeyValidation success(String modelInfo) {
        return ApiKeyValidation.builder()
                .valid(true)
                .message("API 키가 유효합니다")
                .modelInfo(modelInfo)
                .build();
    }
    
    public static ApiKeyValidation failure(String errorMessage) {
        return ApiKeyValidation.builder()
                .valid(false)
                .message(errorMessage)
                .build();
    }
}
