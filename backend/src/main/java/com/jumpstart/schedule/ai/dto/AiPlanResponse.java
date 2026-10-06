package com.jumpstart.schedule.ai.dto;

import java.util.List;

public record AiPlanResponse(
        String date,
        List<PlannedTask> tasks
) {
    public record PlannedTask(
            String title,
            String topicTitle,
            Long topicId,
            Long goalId,
            String goalTitle,
            String difficulty,
            int estimatedMinutes,
            int sortOrder
    ) {}
}
