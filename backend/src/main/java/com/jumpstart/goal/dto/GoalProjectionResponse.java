package com.jumpstart.goal.dto;

import java.time.LocalDate;

public record GoalProjectionResponse(
        Long goalId,
        String goalTitle,
        double targetValue,
        double progressValue,
        double remainingValue,
        String unit,
        LocalDate dueDate,
        double avgDailyMinutes,
        int estimatedDaysRemaining,
        LocalDate projectedCompletionDate,
        boolean onTrack,
        String insight
) {}
