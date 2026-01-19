package com.jjajo.application.service;

import com.jjajo.application.port.in.ValidateApiKeyUseCase;
import com.jjajo.application.port.out.GeminiPort;
import com.jjajo.domain.model.ApiKeyValidation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * API 키 유효성 검증 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApiKeyValidationService implements ValidateApiKeyUseCase {
    
    private final GeminiPort geminiPort;
    
    @Override
    public ApiKeyValidation validate(String apiKey) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("API 키가 비어있습니다");
            return ApiKeyValidation.failure("API 키를 입력해주세요");
        }
        
        try {
            log.info("Gemini API 키 유효성 검증 시작");
            String modelInfo = geminiPort.testConnection(apiKey);
            log.info("API 키 유효성 검증 성공: {}", modelInfo);
            return ApiKeyValidation.success(modelInfo);
        } catch (Exception e) {
            log.error("API 키 유효성 검증 실패: {}", e.getMessage());
            return ApiKeyValidation.failure("API 키가 유효하지 않습니다: " + e.getMessage());
        }
    }
}
