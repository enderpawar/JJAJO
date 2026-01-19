package com.jjajo.presentation.controller;

import com.jjajo.application.port.in.ValidateApiKeyUseCase;
import com.jjajo.domain.model.ApiKeyValidation;
import com.jjajo.presentation.dto.ApiKeyValidationRequest;
import com.jjajo.presentation.dto.ApiKeyValidationResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * API 키 관리 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/apikey")
@RequiredArgsConstructor
public class ApiKeyController {
    
    private final ValidateApiKeyUseCase validateApiKeyUseCase;
    
    /**
     * Gemini API 키의 유효성을 검증합니다
     * 
     * @param request API 키 검증 요청
     * @return 검증 결과
     */
    @PostMapping("/validate")
    public ResponseEntity<ApiKeyValidationResponse> validateApiKey(
            @Valid @RequestBody ApiKeyValidationRequest request) {
        
        log.info("API 키 유효성 검증 요청 수신");
        
        ApiKeyValidation validation = validateApiKeyUseCase.validate(request.getApiKey());
        ApiKeyValidationResponse response = ApiKeyValidationResponse.from(validation);
        
        log.info("API 키 유효성 검증 완료 - 유효: {}", validation.isValid());
        
        return ResponseEntity.ok(response);
    }
}
