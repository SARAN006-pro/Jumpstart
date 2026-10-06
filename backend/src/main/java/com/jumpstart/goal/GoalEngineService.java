package com.jumpstart.goal;

import com.jumpstart.goal.checkin.GoalCheckIn;
import com.jumpstart.goal.checkin.GoalCheckInRepository;
import com.jumpstart.goal.milestone.Milestone;
import com.jumpstart.goal.milestone.MilestoneRepository;
import com.jumpstart.goal.streak.StreakFreezeRepository;
import com.jumpstart.notification.NotificationDto;
import com.jumpstart.schedule.session.ScheduleSession;
import com.jumpstart.schedule.session.ScheduleSessionRepository;
import com.jumpstart.topic.progress.TopicProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoalEngineService {

    private final GoalRepository goalRepository;
    private final GoalCheckInRepository checkInRepository;
    private final MilestoneRepository milestoneRepository;
    private final StreakFreezeRepository freezeRepository;
    private final ScheduleSessionRepository sessionRepository;
    private final TopicProgressRepository topicProgressRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void processSessionCompleted(Long userId, ScheduleSession session) {
        Long topicId = session.getTopic() != null ? session.getTopic().getId() : null;
        Long roadmapId = session.getTopic() != null && session.getTopic().getRoadmap() != null
            ? session.getTopic().getRoadmap().getId() : null;

        List<Goal> affected = goalRepository.findByOwnerIdAndStatusAndTrackingType(userId, "active", "AUTOMATIC");

        for (Goal goal : affected) {
            boolean matchesRoadmap = roadmapId != null && goal.getLinkedRoadmap() != null
                && goal.getLinkedRoadmap().getId().equals(roadmapId);
            boolean matchesTopic = topicId != null && goal.getTopic() != null
                && goal.getTopic().getId().equals(topicId);
            if (!matchesRoadmap && !matchesTopic && goal.getLinkedRoadmap() == null && goal.getTopic() == null) continue;

            double oldValue = goal.getProgressValue();
            double newValue = recalculateProgress(userId, goal);

            if (newValue != oldValue) {
                goal.setProgressValue(newValue);
                goalRepository.save(goal);
                processStreakAndNotifications(goal, oldValue, newValue);
                checkMilestones(goal);
            }
        }
    }

    private double recalculateProgress(Long userId, Goal goal) {
        return switch (goal.getMetricType()) {
            case "HOURS" -> {
                Instant since = goal.getCreatedAt();
                long totalMinutes = sessionRepository
                    .findByUserIdAndPlannedStartTimeBetweenOrderByPlannedStartTimeAsc(
                        userId, since, Instant.now())
                    .stream()
                    .filter(s -> s.getActualDuration() != null)
                    .mapToLong(s -> (long) (s.getActualDuration() / 60.0))
                    .sum();
                yield totalMinutes / 60.0;
            }
            case "TOPICS" -> {
                long completedTopics = topicProgressRepository
                    .findByUserId(userId)
                    .stream()
                    .filter(tp -> tp.getConfidenceLevel() >= 3)
                    .count();
                yield completedTopics;
            }
            default -> goal.getProgressValue();
        };
    }

    @Transactional
    public void processStreakAndNotifications(Goal goal, double previousValue, double newValue) {
        LocalDate today = LocalDate.now();
        LocalDate lastCheckin = goal.getLastCheckedInDate();

        if (newValue > previousValue) {
            if (lastCheckin == null || lastCheckin.equals(today)) {
                // already checked in today, no streak change
            } else if (lastCheckin.equals(today.minusDays(1))) {
                goal.setStreakCount(goal.getStreakCount() + 1);
            } else if (lastCheckin.isBefore(today.minusDays(1))) {
                // Gap detected — check for freeze
                long availableFreezes = freezeRepository.countByUserIdAndIsUsedFalse(goal.getOwner().getId());
                if (availableFreezes > 0) {
                    // Use a freeze
                    var freeze = freezeRepository.findByUserIdAndUsedDate(goal.getOwner().getId(), today.minusDays(1))
                        .orElse(null);
                    if (freeze != null) {
                        freeze.setUsed(true);
                        freezeRepository.save(freeze);
                    }
                    goal.setStreakCount(goal.getStreakCount() + 1);
                } else {
                    goal.setStreakCount(1);
                }
            }
            goal.setLastCheckedInDate(today);
            if (goal.getStreakCount() > goal.getBestStreak()) {
                goal.setBestStreak(goal.getStreakCount());
            }
            goalRepository.save(goal);
        }

        // Milestone alerts
        double ratio = goal.getTargetValue() > 0 ? newValue / goal.getTargetValue() : 0;
        double oldRatio = goal.getTargetValue() > 0 ? previousValue / goal.getTargetValue() : 0;

        if (ratio >= 0.8 && oldRatio < 0.8) {
            sendNotification(goal.getOwner().getId(), "GOAL_THRESHOLD",
                "Almost there!", "\"" + goal.getLabel() + "\" is 80% complete!");
        }

        if (newValue >= goal.getTargetValue() && previousValue < goal.getTargetValue()) {
            goal.setStatus("completed");
            goal.setCompletedAt(Instant.now());
            goalRepository.save(goal);
            sendNotification(goal.getOwner().getId(), "GOAL_COMPLETED",
                "Goal achieved!", "You completed \"" + goal.getLabel() + "\"! 🎉");
        }

        if (goal.getStreakCount() > 0 && goal.getStreakCount() % 7 == 0) {
            sendNotification(goal.getOwner().getId(), "STREAK_MILESTONE",
                "Streak milestone!", goal.getStreakCount() + "-day streak for \"" + goal.getLabel() + "\"!");
        }
    }

    private void checkMilestones(Goal goal) {
        double ratio = goal.getTargetValue() > 0
            ? goal.getProgressValue() / goal.getTargetValue() * 100
            : 0;

        List<Milestone> pending = milestoneRepository
            .findByGoalIdAndIsCompletedFalseOrderByTargetPercentageAsc(goal.getId());

        for (Milestone m : pending) {
            if (ratio >= m.getTargetPercentage() && !m.isCompleted()) {
                m.setCompleted(true);
                m.setCompletedAt(Instant.now());
                milestoneRepository.save(m);
                sendNotification(goal.getOwner().getId(), "MILESTONE_REACHED",
                    "Milestone reached!",
                    "\"" + goal.getLabel() + "\" — " + (int) m.getTargetPercentage() + "% complete");
            }
        }
    }

    @Transactional
    public void autoGenerateMilestones(Goal goal) {
        double[] targets = {25, 50, 75, 100};
        for (double t : targets) {
            Milestone m = Milestone.builder()
                .goal(goal)
                .title((int) t + "% milestone")
                .targetPercentage(t)
                .build();
            milestoneRepository.save(m);
        }
    }

    private void sendNotification(Long userId, String type, String title, String message) {
        try {
            messagingTemplate.convertAndSend("/topic/notifications/" + userId,
                new NotificationDto(type, title, message, null, Instant.now()));
        } catch (Exception e) {
            log.debug("Failed to send notification to user {}: {}", userId, e.getMessage());
        }
    }
}
