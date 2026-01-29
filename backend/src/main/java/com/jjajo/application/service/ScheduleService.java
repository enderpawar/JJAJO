package com.jjajo.application.service;

import com.jjajo.domain.entity.ScheduleEntity;
import com.jjajo.domain.repository.ScheduleRepository;
import com.jjajo.presentation.dto.ScheduleCreateRequest;
import com.jjajo.presentation.dto.ScheduleItemResponse;
import com.jjajo.presentation.dto.ScheduleUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private static final String DEFAULT_STATUS = "pending";
    private static final String DEFAULT_PRIORITY = "medium";
    private static final String DEFAULT_CREATED_BY = "user";

    private final ScheduleRepository scheduleRepository;

    @Transactional(readOnly = true)
    public List<ScheduleItemResponse> listByUserId(String userId) {
        List<ScheduleEntity> entities = scheduleRepository.findByUserIdOrderByDateAscStartTimeAsc(userId);
        return entities.stream().map(ScheduleService::toResponse).toList();
    }

    @Transactional
    public ScheduleItemResponse create(String userId, ScheduleCreateRequest request) {
        String id = UUID.randomUUID().toString();
        String status = request.getStatus() != null && !request.getStatus().isBlank() ? request.getStatus() : DEFAULT_STATUS;
        String priority = request.getPriority() != null && !request.getPriority().isBlank() ? request.getPriority() : DEFAULT_PRIORITY;
        String createdBy = request.getCreatedBy() != null && !request.getCreatedBy().isBlank() ? request.getCreatedBy() : DEFAULT_CREATED_BY;

        ScheduleEntity entity = ScheduleEntity.builder()
                .id(id)
                .userId(userId)
                .title(request.getTitle())
                .description(request.getDescription())
                .date(request.getDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(status)
                .priority(priority)
                .createdBy(createdBy)
                .build();

        entity = scheduleRepository.save(entity);
        return toResponse(entity);
    }

    @Transactional
    public ScheduleItemResponse update(String userId, String id, ScheduleUpdateRequest request) {
        ScheduleEntity entity = scheduleRepository.findByUserIdAndId(userId, id)
                .orElse(null);
        if (entity == null) {
            return null;
        }
        if (request.getTitle() != null) {
            entity.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            entity.setDescription(request.getDescription());
        }
        if (request.getDate() != null) {
            entity.setDate(request.getDate());
        }
        if (request.getStartTime() != null) {
            entity.setStartTime(request.getStartTime());
        }
        if (request.getEndTime() != null) {
            entity.setEndTime(request.getEndTime());
        }
        if (request.getStatus() != null) {
            entity.setStatus(request.getStatus());
        }
        if (request.getPriority() != null) {
            entity.setPriority(request.getPriority());
        }
        entity = scheduleRepository.save(entity);
        return toResponse(entity);
    }

    @Transactional
    public boolean delete(String userId, String id) {
        if (!scheduleRepository.findByUserIdAndId(userId, id).isPresent()) {
            return false;
        }
        scheduleRepository.deleteByUserIdAndId(userId, id);
        return true;
    }

    private static ScheduleItemResponse toResponse(ScheduleEntity e) {
        return ScheduleItemResponse.builder()
                .id(e.getId())
                .title(e.getTitle())
                .description(e.getDescription())
                .date(e.getDate())
                .startTime(e.getStartTime())
                .endTime(e.getEndTime())
                .status(e.getStatus())
                .priority(e.getPriority())
                .createdBy(e.getCreatedBy())
                .createdAt(e.getCreatedAt() != null ? e.getCreatedAt().toString() : null)
                .updatedAt(e.getUpdatedAt() != null ? e.getUpdatedAt().toString() : null)
                .build();
    }
}
