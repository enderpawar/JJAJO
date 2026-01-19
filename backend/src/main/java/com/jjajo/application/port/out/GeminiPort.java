package com.jjajo.application.port.out;

/**
 * Gemini API와 통신하기 위한 포트 인터페이스
 */
public interface GeminiPort {
    /**
     * 주어진 API 키로 Gemini API 연결을 테스트합니다
     * 
     * @param apiKey Gemini API 키
     * @return 사용 가능한 모델 정보 (성공 시)
     * @throws RuntimeException API 키가 유효하지 않거나 통신 실패 시
     */
    String testConnection(String apiKey);
}
