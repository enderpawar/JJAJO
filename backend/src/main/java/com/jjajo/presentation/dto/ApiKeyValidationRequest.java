package com.jjajo.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * API 키 유효성 검증 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
public class ApiKeyValidationRequest {
    
    @NotBlank(message = "API 키는 필수입니다")
    private String apiKey;
}
