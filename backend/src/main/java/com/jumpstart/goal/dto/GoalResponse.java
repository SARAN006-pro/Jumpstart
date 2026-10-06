package com.jumpstart.goal.dto;

import com.jumpstart.goal.Goal;

import java.time.Instant;
import java.time.LocalDate;

public record GoalResponse(
        Long id,
        String label,
        String description,
        String cadence,
        String priority,
        String status,
        double targetValue,
        double progressValue,
        String unit,
        String metricType,
        String trackingType,
        boolean complete,
        LocalDate dueDate,
        Long topicId,
        Long roadmapId,
        int streakCount,
        int bestStreak,
        LocalDate lastCheckedInDate,
        Instant completedAt,
        Long prerequisiteGoalId,
        Double unlockThreshold,
        boolean locked
) {
    public static GoalResponse from(Goal goal, boolean locked) {
        return new GoalResponse(
                goal.getId(), goal.getLabel(), goal.getDescription(),
                goal.getCadence().name(),
                goal.getPriority(), goal.getStatus(),
                goal.getTargetValue(), goal.getProgressValue(), goal.getUnit(),
                goal.getMetricType(), goal.getTrackingType(),
                goal.getProgressValue() >= goal.getTargetValue(),
                goal.getDueDate(),
                goal.getTopic() != null ? goal.getTopic().getId() : null,
                goal.getLinkedRoadmap() != null ? goal.getLinkedRoadmap().getId() : null,
                goal.getStreakCount(), goal.getBestStreak(),
                goal.getLastCheckedInDate(),
                goal.getCompletedAt(),
                goal.getPrerequisiteGoalId(),
                goal.getUnlockThreshold(),
                locked
        );
    }
}
