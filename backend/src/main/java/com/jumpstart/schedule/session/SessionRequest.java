package com.jumpstart.schedule.session;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record SessionRequest(
    @NotBlank String title,
    Long topicId,
    Long resourceId,
    @NotNull Instant plannedStartTime,
    @NotNull Instant plannedEndTime,
    @NotBlank String timezone,
    String recurrenceRule,
    String notes
) {}
