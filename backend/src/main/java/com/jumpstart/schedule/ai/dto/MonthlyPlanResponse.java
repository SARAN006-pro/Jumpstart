package com.jumpstart.schedule.ai.dto;

import com.jumpstart.schedule.ai.MonthlyPlan;
import java.time.LocalDate;

public record MonthlyPlanResponse(
        Long id, Long userId, String monthKey, LocalDate date,
        String taskTitle, Long topicId, String topicTitle,
        Long roadmapId, String roadmapTitle, String roadmapColor,
        int estimatedMinutes, int sortOrder, String status, String difficulty
) {
    public static MonthlyPlanResponse from(MonthlyPlan p) {
        return new MonthlyPlanResponse(
                p.getId(), p.getUser().getId(), p.getMonthKey(), p.getDate(),
                p.getTaskTitle(), p.getTopicId(), p.getTopicTitle(),
                p.getRoadmapId(), p.getRoadmapTitle(), p.getRoadmapColor(),
                p.getEstimatedMinutes(), p.getSortOrder(), p.getStatus(), p.getDifficulty()
        );
    }
}
