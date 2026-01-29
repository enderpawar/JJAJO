package com.jjajo.domain.repository;

import com.jjajo.domain.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * User 리포지토리
 *
 * 설계 근거:
 * - provider + providerId(sub)를 기준으로 사용자 조회
 * - 이메일 기반 조회도 가능하도록 확장
 */
@Repository
public interface UserRepository extends JpaRepository<UserEntity, String> {

    Optional<UserEntity> findByProviderAndProviderId(UserEntity.AuthProvider provider, String providerId);

    Optional<UserEntity> findByEmail(String email);
}

