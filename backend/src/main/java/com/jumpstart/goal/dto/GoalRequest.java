package com.jumpstart.goal.dto;

import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record GoalRequest(
        @NotBlank @Size(max = 160) String label,
        String description,
        @NotNull @Pattern(regexp = "DAILY|WEEKLY|MONTHLY|LONGTERM",
                message = "Cadence must be DAILY, WEEKLY, MONTHLY, or LONGTERM") String cadence,
        @Pattern(regexp = "low|medium|high") String priority,
        @Pattern(regexp = "active|completed|cancelled|failed|paused") String status,
        @Positive double targetValue,
        @PositiveOrZero double progressValue,
        @Size(max = 30) String unit,
        @Pattern(regexp = "HOURS|TOPICS|PROJECTS|CUSTOM") String metricType,
        @Pattern(regexp = "AUTOMATIC|MANUAL") String trackingType,
        LocalDate dueDate,
        Long topicId,
        Long roadmapId,
        Long prerequisiteGoalId,
        @PositiveOrZero Double unlockThreshold
) {
    public String metricType() { return metricType != null ? metricType : "HOURS"; }
    public String trackingType() { return trackingType != null ? trackingType : "MANUAL"; }
}
