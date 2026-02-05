package com.jjajo.presentation.config;

/**
 * FRONTEND_ORIGIN이 스킴 없이(예: jjajo.pages.dev) 설정되면
 * sendRedirect가 상대 URL로 처리되어 백엔드 호스트 뒤에 경로가 반복 붙는 문제를 방지.
 * 항상 절대 URL(https://...)으로 변환한다.
 */
public final class FrontendOriginNormalizer {

    /**
     * null/빈 값이거나 http(s)로 시작하지 않으면 https:// 를 붙여 절대 URL로 반환.
     * 끝의 슬래시는 제거 (리다이렉트 시 호출하는 쪽에서 "/" 추가).
     */
    public static String toAbsoluteUrl(String frontendOrigin) {
        if (frontendOrigin == null || frontendOrigin.isEmpty()) {
            return "http://localhost:5173";
        }
        String s = frontendOrigin.trim();
        if (!s.startsWith("http://") && !s.startsWith("https://")) {
            s = "https://" + s;
        }
        return s.replaceAll("/+$", "");
    }
}
