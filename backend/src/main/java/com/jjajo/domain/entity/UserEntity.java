package com.jjajo.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 사용자 엔티티 (JPA)
 *
 * 설계 근거:
 * - Google OAuth2를 통해 인증된 사용자를 내부적으로 관리하기 위한 기본 사용자 테이블
 * - provider + providerId(sub)를 유니크하게 관리하여 동일 계정 중복 생성을 방지
 * - 다른 도메인 엔티티(Goal, Conversation 등)의 userId는 이 엔티티의 id를 참조하는 문자열로 사용
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserEntity {

    /**
     * 내부 사용자 식별자
     * UUID 문자열 등을 사용하며, 다른 엔티티의 userId에서 참조
     */
    @Id
    @Column(length = 36)
    private String id;

    /**
     * OAuth 제공자 (GOOGLE 등)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 20)
    private AuthProvider provider;

    /**
     * 제공자 내에서의 사용자 식별자 (예: Google sub)
     */
    @Column(name = "provider_id", nullable = false, length = 100, unique = true)
    private String providerId;

    /**
     * 사용자 이메일
     */
    @Column(name = "email", nullable = false, length = 255)
    private String email;

    /**
     * 사용자 표시 이름
     */
    @Column(name = "name", length = 100)
    private String name;

    /**
     * 프로필 이미지 URL
     */
    @Column(name = "picture_url", length = 500)
    private String pictureUrl;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum AuthProvider {
        GOOGLE
    }
}

