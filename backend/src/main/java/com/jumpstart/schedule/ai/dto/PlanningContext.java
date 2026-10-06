package com.jumpstart.schedule.ai.dto;

import com.jumpstart.topic.TopicStatus;
import java.util.List;

public record PlanningContext(
        String roadmapTitle,
        List<TopicSeed> pendingTopics,
        UserAvail userAvailability,
        double learningPaceAvgMinutes
) {
    public record TopicSeed(
            Long id, String title, int difficulty,
            int estimatedMinutes, Long prerequisiteTopicId, TopicStatus status
    ) {}

    public record UserAvail(
            int preferredStudyHoursPerDay,
            List<String> availableDays
    ) {}
}
