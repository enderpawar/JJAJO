package com.jjajo.application.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * 학습 자료 링크 생성 서비스
 */
@Slf4j
@Service
public class LearningResourceService {
    
    /**
     * 목표 키워드 기반 검색 URL 생성
     */
    public String generateSearchUrl(String goalKeyword, String platform) {
        try {
            String encodedKeyword = URLEncoder.encode(goalKeyword, StandardCharsets.UTF_8.toString());
            
            return switch (platform.toLowerCase()) {
                case "유튜브", "youtube" -> 
                    String.format("https://www.youtube.com/results?search_query=%s", encodedKeyword);
                    
                case "인프런", "inflearn" -> 
                    String.format("https://www.inflearn.com/courses?s=%s", encodedKeyword);
                    
                case "교보문고", "kyobobook" -> 
                    String.format("https://www.kyobobook.co.kr/search?keyword=%s", encodedKeyword);
                    
                case "예스24", "yes24" -> 
                    String.format("http://www.yes24.com/Product/Search?query=%s", encodedKeyword);
                    
                case "유데미", "udemy" -> 
                    String.format("https://www.udemy.com/courses/search/?q=%s", encodedKeyword);
                    
                case "노마드코더", "nomadcoders" -> 
                    String.format("https://nomadcoders.co/courses?search=%s", encodedKeyword);
                    
                case "구글", "google" -> 
                    String.format("https://www.google.com/search?q=%s", encodedKeyword);
                    
                default -> 
                    String.format("https://www.google.com/search?q=%s", encodedKeyword);
            };
            
        } catch (UnsupportedEncodingException e) {
            log.error("URL 인코딩 실패", e);
            return "https://www.google.com/search?q=" + goalKeyword.replace(" ", "+");
        }
    }
    
    /**
     * 목표별 추천 플랫폼 목록 반환
     */
    public String[] getRecommendedPlatforms(String goalKeyword) {
        String lowerKeyword = goalKeyword.toLowerCase();
        
        // 프로그래밍/개발 관련
        if (lowerKeyword.contains("java") || lowerKeyword.contains("python") || 
            lowerKeyword.contains("javascript") || lowerKeyword.contains("react") ||
            lowerKeyword.contains("spring") || lowerKeyword.contains("개발") ||
            lowerKeyword.contains("코딩") || lowerKeyword.contains("프로그래밍")) {
            return new String[]{"인프런", "유튜브", "노마드코더"};
        }
        
        // 영어/토익/토플
        if (lowerKeyword.contains("toeic") || lowerKeyword.contains("toefl") ||
            lowerKeyword.contains("영어") || lowerKeyword.contains("토익") ||
            lowerKeyword.contains("토플")) {
            return new String[]{"유튜브", "교보문고", "예스24"};
        }
        
        // 자격증
        if (lowerKeyword.contains("자격증") || lowerKeyword.contains("기사") ||
            lowerKeyword.contains("산업") || lowerKeyword.contains("certificate")) {
            return new String[]{"교보문고", "유튜브", "예스24"};
        }
        
        // 기본 - 모든 플랫폼
        return new String[]{"유튜브", "교보문고", "인프런"};
    }
    
    /**
     * 목표 키워드와 플랫폼 기반 구체적인 검색 쿼리 생성
     */
    public String generateSearchQuery(String goalKeyword, String weekTheme, String platform) {
        // 주차 테마가 있으면 더 구체적인 검색어 생성
        if (weekTheme != null && !weekTheme.isEmpty()) {
            return String.format("%s %s", goalKeyword, weekTheme);
        }
        
        // 플랫폼별 추천 검색어 접미사
        return switch (platform.toLowerCase()) {
            case "유튜브", "youtube" -> goalKeyword + " 강의";
            case "교보문고", "예스24", "kyobobook", "yes24" -> goalKeyword + " 교재";
            case "인프런", "유데미", "inflearn", "udemy" -> goalKeyword + " 강좌";
            default -> goalKeyword;
        };
    }
}
