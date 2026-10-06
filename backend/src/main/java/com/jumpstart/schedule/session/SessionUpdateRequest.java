package com.jumpstart.schedule.session;

import java.time.Instant;

public record SessionUpdateRequest(
    String title,
    Long topicId,
    Long resourceId,
    String status,
    Instant plannedStartTime,
    Instant plannedEndTime,
    Instant actualStartTime,
    Instant actualEndTime,
    Integer actualDuration,
    String timezone,
    String recurrenceRule,
    Integer pomodoroCount,
    Integer rating,
    String notes
) {}
