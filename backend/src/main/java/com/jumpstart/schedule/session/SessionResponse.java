package com.jumpstart.schedule.session;

import java.time.Instant;

public record SessionResponse(
    Long id,
    Long userId,
    String title,
    Long topicId,
    String topicTitle,
    Long resourceId,
    String resourceTitle,
    String status,
    Instant plannedStartTime,
    Instant plannedEndTime,
    Instant actualStartTime,
    Instant actualEndTime,
    Integer actualDuration,
    String timezone,
    String recurrenceRule,
    Long originalSeriesId,
    int pomodoroCount,
    Integer rating,
    String notes,
    Instant createdAt
) {
    public static SessionResponse from(ScheduleSession s) {
        return new SessionResponse(
            s.getId(),
            s.getUser().getId(),
            s.getTitle(),
            s.getTopic() != null ? s.getTopic().getId() : null,
            s.getTopic() != null ? s.getTopic().getTitle() : null,
            s.getResource() != null ? s.getResource().getId() : null,
            s.getResource() != null ? s.getResource().getTitle() : null,
            s.getStatus().name(),
            s.getPlannedStartTime(),
            s.getPlannedEndTime(),
            s.getActualStartTime(),
            s.getActualEndTime(),
            s.getActualDuration(),
            s.getTimezone(),
            s.getRecurrenceRule(),
            s.getOriginalSeriesId(),
            s.getPomodoroCount(),
            s.getRating(),
            s.getNotes(),
            s.getCreatedAt()
        );
    }
}
