package com.jumpstart.schedule.ai;

import com.jumpstart.goal.GoalEngineService;
import com.jumpstart.schedule.ai.dto.AICommitRequest;
import com.jumpstart.schedule.ai.dto.PendingSessionResponse;
import com.jumpstart.schedule.session.ConfirmationStatus;
import com.jumpstart.schedule.session.ScheduleSession;
import com.jumpstart.schedule.session.ScheduleSessionRepository;
import com.jumpstart.schedule.session.ScheduleSessionStatus;
import com.jumpstart.topic.Topic;
import com.jumpstart.topic.TopicRepository;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AIScheduleCommitService {

    private final ScheduleSessionRepository sessionRepository;
    private final TopicRepository topicRepository;
    private final UserRepository userRepository;
    private final GoalEngineService goalEngine;

    @Transactional
    public int commitSchedule(Long userId, AICommitRequest request) {
        User user = userRepository.getReferenceById(userId);
        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        int created = 0;

        // 1. Wipe any previously pending AI-generated plans so we never double-book
        List<ScheduleSession> stale = sessionRepository.findAiGeneratedByConfirmation(userId, ConfirmationStatus.PENDING);
        if (!stale.isEmpty()) {
            sessionRepository.deleteAll(stale);
            log.info("Cleared {} stale AI-generated sessions for user {}", stale.size(), userId);
        }

        // 2. Build new sessions from the AI response
        List<ScheduleSession> fresh = new ArrayList<>();
        for (var dayBlock : request.dailyPlans()) {
            LocalDate planDate = parseDayLabel(dayBlock.dayLabel(), today);
            if (planDate == null) continue;

            for (var task : dayBlock.tasks()) {
                Topic topic = task.topicId() != null ? topicRepository.findById(task.topicId()).orElse(null) : null;
                String title = topic != null ? topic.getTitle() : "Study Session";

                Instant start = planDate.atTime(9, 0).atZone(ZoneId.systemDefault()).toInstant();
                Instant end = start.plusSeconds(task.approxDurationMinutes() * 60L);

                ScheduleSession session = ScheduleSession.builder()
                        .user(user)
                        .title(title)
                        .topic(topic)
                        .status(ScheduleSessionStatus.PLANNED)
                        .plannedStartTime(start)
                        .plannedEndTime(end)
                        .timezone(ZoneId.systemDefault().getId())
                        .isAiGenerated(true)
                        .confirmationStatus(ConfirmationStatus.PENDING)
                        .notes("AI-generated - " + task.taskType() + "\n" + task.reasoning())
                        .build();

                fresh.add(session);
            }
        }

        // 3. Batch persist
        sessionRepository.saveAll(fresh);
        created = fresh.size();

        // 4. Sync goals: for each affected topic, create a daily goal if one does not exist yet
        Set<Long> topicIds = request.dailyPlans().stream()
                .flatMap(d -> d.tasks().stream())
                .map(AICommitRequest.AITask::topicId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        for (Long tid : topicIds) {
            try {
                goalEngine.processSessionCompleted(userId,
                        ScheduleSession.builder()
                                .topic(tid != null ? topicRepository.getReferenceById(tid) : null)
                                .build()
                );
            } catch (Exception e) {
                log.warn("Goal sync failed for topic {}", tid, e);
            }
        }

        log.info("Committed {} AI-generated sessions for user {} (confirmation: PENDING)", created, userId);
        return created;
    }

    @Transactional
    public int confirmSessions(Long userId, List<Long> sessionIds, ConfirmationStatus status) {
        List<ScheduleSession> sessions = sessionRepository.findAllById(sessionIds);
        int updated = 0;
        for (ScheduleSession s : sessions) {
            if (s.getUser().getId().equals(userId) && s.isAiGenerated()) {
                s.setConfirmationStatus(status);
                if (status == ConfirmationStatus.REJECTED) {
                    s.setStatus(ScheduleSessionStatus.SKIPPED);
                }
                updated++;
            }
        }
        sessionRepository.saveAll(sessions);
        log.info("Updated confirmation to {} for {} AI sessions (user {})", status, updated, userId);
        return updated;
    }

    @Transactional(readOnly = true)
    public List<PendingSessionResponse> getPendingAiSessions(Long userId) {
        return sessionRepository.findAiGeneratedByConfirmation(userId, ConfirmationStatus.PENDING)
                .stream()
                .map(PendingSessionResponse::from)
                .collect(Collectors.toList());
    }

    private LocalDate parseDayLabel(String dayLabel, LocalDate today) {
        try {
            return LocalDate.parse(dayLabel, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (Exception e) { /* try other formats */ }

        String lower = dayLabel.toLowerCase().trim();
        if (lower.startsWith("day ")) {
            int offset = 0;
            try { offset = Integer.parseInt(lower.replace("day ", "").trim()) - 1; } catch (Exception ignored) {}
            return today.plusDays(offset);
        }

        try {
            DayOfWeek targetDay = DayOfWeek.valueOf(dayLabel.toUpperCase());
            DayOfWeek todayDay = today.getDayOfWeek();
            int diff = targetDay.getValue() - todayDay.getValue();
            if (diff <= 0) diff += 7;
            return today.plusDays(diff);
        } catch (Exception e) { /* fall through */ }

        return today;
    }
}
