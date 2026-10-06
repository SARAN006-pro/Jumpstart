package com.jumpstart.schedule.ai.dto;

import com.jumpstart.schedule.session.ScheduleSession;
import java.time.Instant;

public record PendingSessionResponse(
        Long id,
        String title,
        Long topicId,
        String topicTitle,
        Instant plannedStartTime,
        Instant plannedEndTime,
        int estimatedMinutes,
        String notes
) {
    public static PendingSessionResponse from(ScheduleSession s) {
        return new PendingSessionResponse(
                s.getId(), s.getTitle(),
                s.getTopic() != null ? s.getTopic().getId() : null,
                s.getTopic() != null ? s.getTopic().getTitle() : null,
                s.getPlannedStartTime(), s.getPlannedEndTime(),
                s.getPlannedEndTime() != null && s.getPlannedStartTime() != null
                        ? (int) (s.getPlannedEndTime().getEpochSecond() - s.getPlannedStartTime().getEpochSecond()) / 60
                        : 0,
                s.getNotes()
        );
    }
}
