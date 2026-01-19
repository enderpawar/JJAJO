package com.jjajo.application.port.in;

import com.jjajo.domain.model.ApiKeyValidation;

/**
 * API 키 유효성 검증 유스케이스 인터페이스
 */
public interface ValidateApiKeyUseCase {
    /**
     * Gemini API 키의 유효성을 검증합니다
     * 
     * @param apiKey 검증할 Gemini API 키
     * @return 검증 결과
     */
    ApiKeyValidation validate(String apiKey);
}
