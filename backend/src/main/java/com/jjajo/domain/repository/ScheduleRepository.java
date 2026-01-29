package com.jjajo.domain.repository;

import com.jjajo.domain.entity.ScheduleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScheduleRepository extends JpaRepository<ScheduleEntity, String> {

    List<ScheduleEntity> findByUserIdOrderByDateAscStartTimeAsc(String userId);

    Optional<ScheduleEntity> findByUserIdAndId(String userId, String id);

    void deleteByUserIdAndId(String userId, String id);
}
