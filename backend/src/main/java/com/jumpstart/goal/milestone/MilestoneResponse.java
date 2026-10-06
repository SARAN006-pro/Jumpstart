package com.jumpstart.goal.milestone;

import java.time.Instant;

public record MilestoneResponse(
    Long id,
    Long goalId,
    String title,
    double targetPercentage,
    boolean isCompleted,
    Instant completedAt
) {
    public static MilestoneResponse from(Milestone m) {
        return new MilestoneResponse(
            m.getId(), m.getGoal().getId(), m.getTitle(),
            m.getTargetPercentage(), m.isCompleted(), m.getCompletedAt()
        );
    }
}
