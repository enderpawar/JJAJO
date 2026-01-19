package com.jjajo.presentation.dto;

import com.jjajo.domain.model.ApiKeyValidation;
import lombok.Builder;
import lombok.Getter;

/**
 * API 키 유효성 검증 응답 DTO
 */
@Getter
@Builder
public class ApiKeyValidationResponse {
    private final boolean valid;
    private final String message;
    private final String modelInfo;
    
    public static ApiKeyValidationResponse from(ApiKeyValidation validation) {
        return ApiKeyValidationResponse.builder()
                .valid(validation.isValid())
                .message(validation.getMessage())
                .modelInfo(validation.getModelInfo())
                .build();
    }
}
