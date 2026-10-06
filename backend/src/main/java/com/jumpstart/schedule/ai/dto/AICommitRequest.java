package com.jumpstart.schedule.ai.dto;

import java.util.List;

public record AICommitRequest(
        String planOverview,
        List<DailyPlanBlock> dailyPlans
) {
    public record DailyPlanBlock(
            String dayLabel,
            int totalLoadMinutes,
            List<AITask> tasks
    ) {}

    public record AITask(
            Long topicId,
            String taskType,
            int approxDurationMinutes,
            String reasoning
    ) {}
}
