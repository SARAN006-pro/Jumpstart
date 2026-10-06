package com.jumpstart.analytics.dto;

import java.util.List;

public record CognitiveAnalysisResponse(
    List<String> strengths,
    List<String> bottlenecks,
    String optimalStrategy,
    String predictedBurnoutRisk,
    StudyStats studyStats
) {
    public record StudyStats(
        double avgSessionMinutes,
        long totalSessions,
        long totalFocusMinutes,
        int longestStreakDays,
        int currentStreakDays
    ) {}
}
