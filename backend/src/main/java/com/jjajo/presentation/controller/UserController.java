package com.jjajo.presentation.controller;

import com.jjajo.presentation.config.SecurityConfig;
import com.jjajo.presentation.dto.UserInfoResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 사용자 관련 API
 *
 * - /api/me: 현재 로그인한 사용자 정보 조회
 */
@Slf4j
@RestController
@RequestMapping("/api")
public class UserController {

    @GetMapping("/me")
    public ResponseEntity<UserInfoResponse> getCurrentUser(
            @AuthenticationPrincipal OAuth2User oAuth2User,
            Authentication authentication
    ) {
        if (oAuth2User == null || authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String userId = SecurityConfig.extractUserId(authentication);
        String email = (String) oAuth2User.getAttributes().getOrDefault("email", null);
        String name = (String) oAuth2User.getAttributes().getOrDefault("name", null);
        String picture = (String) oAuth2User.getAttributes().getOrDefault("picture", null);

        UserInfoResponse body = UserInfoResponse.builder()
                .userId(userId)
                .email(email)
                .name(name)
                .pictureUrl(picture)
                .build();

        return ResponseEntity.ok(body);
    }
}

