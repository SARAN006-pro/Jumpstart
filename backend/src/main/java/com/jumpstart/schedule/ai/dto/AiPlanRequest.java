package com.jumpstart.schedule.ai.dto;

import java.util.List;

public record AiPlanRequest(
        String date,
        List<TaskSeed> tasks,
        String groqApiKey
) {
    public record TaskSeed(
            String title,
            String topicTitle,
            Long topicId,
            Long goalId,
            String goalTitle,
            String difficulty,
            Integer estimatedMinutes
    ) {}
}
