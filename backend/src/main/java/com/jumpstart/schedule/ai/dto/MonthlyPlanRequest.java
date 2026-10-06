package com.jumpstart.schedule.ai.dto;

import java.util.List;

public record MonthlyPlanRequest(
        String monthKey,
        List<Long> roadmapIds,
        String groqApiKey,
        Integer dailyMinutes
) {}
