package com.jumpstart.schedule.ai;

import com.jumpstart.roadmap.Roadmap;
import com.jumpstart.roadmap.RoadmapRepository;
import com.jumpstart.schedule.ai.dto.PlanningContext;
import com.jumpstart.schedule.session.ScheduleSessionRepository;
import com.jumpstart.topic.Topic;
import com.jumpstart.topic.TopicRepository;
import com.jumpstart.topic.prerequisite.TopicPrerequisiteRepository;
import com.jumpstart.user.settings.UserSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlanningContextService {

    private final RoadmapRepository roadmapRepository;
    private final TopicRepository topicRepository;
    private final TopicPrerequisiteRepository prerequisiteRepository;
    private final UserSettingsRepository userSettingsRepository;
    private final ScheduleSessionRepository sessionRepository;

    public PlanningContext getContext(Long userId, List<Long> roadmapIds) {
        String roadmapTitle = "";
        List<PlanningContext.TopicSeed> pendingTopics = new ArrayList<>();
        Set<String> allDays = new LinkedHashSet<>();

        for (Long rid : roadmapIds) {
            Roadmap r = roadmapRepository.findById(rid).orElse(null);
            if (r == null) continue;
            if (roadmapTitle.isEmpty()) roadmapTitle = r.getTitle();
            else roadmapTitle += " + " + r.getTitle();

            List<Topic> topics = topicRepository.findByRoadmapIdOrderBySortOrderAsc(rid);
            for (Topic t : topics) {
                if (t.getStatus() == com.jumpstart.topic.TopicStatus.COMPLETED || t.getStatus() == com.jumpstart.topic.TopicStatus.DONE) continue;

                Long prereqId = null;
                try {
                    var prereqs = prerequisiteRepository.findByTopicId(t.getId());
                    if (!prereqs.isEmpty()) prereqId = prereqs.get(0).getPrerequisiteTopic().getId();
                } catch (Exception e) { /* no prereqs */ }

                pendingTopics.add(new PlanningContext.TopicSeed(
                        t.getId(), t.getTitle(), t.getDifficulty(),
                        (int) Math.ceil(t.getEstHours() * 60),
                        prereqId, t.getStatus()
                ));
            }
        }

        // User availability
        int preferredHours = 2;
        List<String> availableDays = List.of("Monday", "Tuesday", "Wednesday", "Thursday", "Friday");
        try {
            var settings = userSettingsRepository.findByUserId(userId).orElse(null);
            if (settings != null) {
                preferredHours = settings.getDailyStudyHours();
                if (settings.getAvailability() != null && !settings.getAvailability().isBlank()) {
                    try {
                        com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
                        var availMap = om.readValue(settings.getAvailability(), Map.class);
                        availableDays = new ArrayList<>(availMap.keySet());
                    } catch (Exception e) { /* use defaults */ }
                }
            }
        } catch (Exception e) { /* use defaults */ }

        // Learning pace — avg daily minutes over last 14 days
        double pace = 0;
        try {
            Instant twoWeeksAgo = Instant.now().minusSeconds(14 * 24 * 3600);
            var recentSessions = sessionRepository.findByUserIdAndPlannedStartTimeGreaterThanEqualAndPlannedStartTimeLessThanAndStatus(
                    userId, twoWeeksAgo, Instant.now(), com.jumpstart.schedule.session.ScheduleSessionStatus.COMPLETED
            );
            if (!recentSessions.isEmpty()) {
                pace = recentSessions.stream()
                        .mapToInt(s -> {
                            if (s.getActualDuration() != null) return s.getActualDuration();
                            return (int) java.time.Duration.between(s.getPlannedStartTime(), s.getPlannedEndTime()).toMinutes();
                        })
                        .average().orElse(0);
            }
        } catch (Exception e) { /* ignore */ }

        return new PlanningContext(
                roadmapTitle,
                pendingTopics,
                new PlanningContext.UserAvail(preferredHours, availableDays),
                pace
        );
    }
}
