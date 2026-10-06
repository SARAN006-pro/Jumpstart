package com.jumpstart.notification;

import com.jumpstart.goal.Goal;
import com.jumpstart.goal.GoalRepository;
import com.jumpstart.schedule.StudySchedule;
import com.jumpstart.schedule.StudyScheduleRepository;
import com.jumpstart.schedule.session.ScheduleSession;
import com.jumpstart.schedule.session.ScheduleSessionRepository;
import com.jumpstart.schedule.session.ScheduleSessionStatus;
import com.jumpstart.topic.progress.TopicProgressRepository;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduleNotificationService {

    private final StudyScheduleRepository scheduleRepository;
    private final ScheduleSessionRepository sessionRepository;
    private final TopicProgressRepository topicProgressRepository;
    private final UserRepository userRepository;
    private final GoalRepository goalRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Scheduled(fixedRate = 60_000)
    @Transactional(readOnly = true)
    public void checkUpcomingSessions() {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        List<StudySchedule> upcoming = scheduleRepository
            .findByScheduledDate(today)
            .stream()
            .filter(s -> {
                long minutesUntil = java.time.Duration.between(now, LocalTime.of(9, 0)).toMinutes();
                return minutesUntil > 0 && minutesUntil <= 30;
            })
            .toList();

        for (StudySchedule s : upcoming) {
            User u = s.getUser();
            if (u == null) continue;

            NotificationDto note = new NotificationDto(
                "SESSION_SOON",
                "Study session starting soon",
                "\"" + s.getTopic().getTitle() + "\" begins at 9:00 (" + s.getPlannedMinutes() + " min)",
                s.getId(),
                Instant.now()
            );
            messagingTemplate.convertAndSend("/topic/notifications/" + u.getId(), note);
        }

        // Advanced ScheduleSession upcoming check (15 min window)
        Instant nowInstant = Instant.now();
        Instant windowEnd = nowInstant.plusSeconds(15 * 60);
        List<ScheduleSession> advancedUpcoming = sessionRepository.findUpcomingInRange(
            nowInstant, windowEnd, ScheduleSessionStatus.PLANNED
        );
        for (ScheduleSession s : advancedUpcoming) {
            NotificationDto note = new NotificationDto(
                "SESSION_SOON",
                "Session starting soon",
                "\"" + s.getTitle() + "\" at " + s.getPlannedStartTime().toString(),
                s.getId(),
                Instant.now()
            );
            messagingTemplate.convertAndSend("/topic/notifications/" + s.getUser().getId(), note);
        }
    }

    @Scheduled(fixedRate = 300_000)
    @Transactional
    public void detectNoShows() {
        Instant threshold = Instant.now().minusSeconds(15 * 60);
        List<ScheduleSession> noShows = sessionRepository.findNoShows(threshold, ScheduleSessionStatus.PLANNED);
        for (ScheduleSession s : noShows) {
            s.setStatus(ScheduleSessionStatus.NO_SHOW);
            sessionRepository.save(s);

            NotificationDto note = new NotificationDto(
                "NO_SHOW",
                "Missed session",
                "You missed \"" + s.getTitle() + "\" — mark it as completed or reschedule.",
                s.getId(),
                Instant.now()
            );
            messagingTemplate.convertAndSend("/topic/notifications/" + s.getUser().getId(), note);
        }
    }

    @Scheduled(cron = "0 0 8 * * ?")
    @Transactional(readOnly = true)
    public void spacedRepetitionReminder() {
        List<User> users = userRepository.findAll();
        Instant sevenDaysAgo = Instant.now().minusSeconds(7 * 24 * 3600);
        for (User u : users) {
            List<com.jumpstart.topic.progress.TopicProgress> stale = topicProgressRepository
                .findStaleTopics(u.getId(), 3, sevenDaysAgo);
            for (var tp : stale) {
                NotificationDto note = new NotificationDto(
                    "SPACED_REPETITION",
                    "Time to revise",
                    "Review \"" + tp.getTopic().getTitle() + "\" — last revised " +
                        (tp.getLastRevisedAt() != null ? tp.getLastRevisedAt().toString() : "never"),
                    tp.getTopic().getId(),
                    Instant.now()
                );
                messagingTemplate.convertAndSend("/topic/notifications/" + u.getId(), note);
            }
        }
    }

    @Scheduled(cron = "0 0 */2 * * ?")
    @Transactional(readOnly = true)
    public void sendWeeklyDigest() {
        List<User> users = userRepository.findAll();
        LocalDate weekStart = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        LocalDate weekEnd = weekStart.plusDays(6);

        for (User u : users) {
            long totalMinutes = scheduleRepository
                .findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(u.getId(), weekStart, weekEnd)
                .stream()
                .mapToInt(StudySchedule::getPlannedMinutes)
                .sum();

            long sessionMinutes = sessionRepository
                .findByUserIdAndPlannedStartTimeBetweenOrderByPlannedStartTimeAsc(
                    u.getId(), weekStart.atStartOfDay().toInstant(java.time.ZoneOffset.UTC),
                    weekEnd.plusDays(1).atStartOfDay().toInstant(java.time.ZoneOffset.UTC)
                )
                .stream()
                .mapToLong(s -> java.time.Duration.between(s.getPlannedStartTime(), s.getPlannedEndTime()).toMinutes())
                .sum();

            long total = totalMinutes + sessionMinutes;
            if (total > 0) {
                NotificationDto note = new NotificationDto(
                    "WEEKLY_DIGEST",
                    "Weekly study overview",
                    total + " min planned this week across " + weekStart + " – " + weekEnd,
                    null,
                    Instant.now()
                );
                messagingTemplate.convertAndSend("/topic/notifications/" + u.getId(), note);
            }
        }
    }

    /**
     * Off-track nudge: runs every 5 min. Finds sessions where plannedStartTime is >15 min ago
     * but actualStartTime is still null (user forgot to start).
     */
    @Scheduled(fixedRate = 300_000)
    @Transactional(readOnly = true)
    public void detectOffTrackSessions() {
        Instant threshold = Instant.now().minusSeconds(15 * 60);
        List<ScheduleSession> offTrack = sessionRepository.findNoShows(threshold, ScheduleSessionStatus.PLANNED);
        for (ScheduleSession s : offTrack) {
            NotificationDto note = new NotificationDto(
                    "OFF_TRACK",
                    "Session starting soon",
                    "\"" + s.getTitle() + "\" was scheduled for " + s.getPlannedStartTime().toString() + " — start your timer?",
                    s.getId(),
                    Instant.now()
            );
            messagingTemplate.convertAndSend("/topic/notifications/" + s.getUser().getId(), note);
        }
    }

    /**
     * Overtime nudge: runs every 5 min. Checks if plannedEndTime has passed but user
     * might still be active (no actualEndTime recorded yet).
     */
    @Scheduled(fixedRate = 300_000)
    @Transactional(readOnly = true)
    public void detectOvertimeSessions() {
        Instant now = Instant.now();
        List<ScheduleSession> over = sessionRepository.findByStatus(ScheduleSessionStatus.PLANNED)
                .stream()
                .filter(s -> s.getPlannedEndTime() != null
                        && s.getPlannedEndTime().isBefore(now)
                        && s.getActualEndTime() == null)
                .collect(Collectors.toList());
        for (ScheduleSession s : over) {
            NotificationDto note = new NotificationDto(
                    "OVERTIME",
                    "Over your planned time",
                    "\"" + s.getTitle() + "\" was planned until " + s.getPlannedEndTime().toString() + ". Extend or wrap up?",
                    s.getId(),
                    now
            );
            messagingTemplate.convertAndSend("/topic/notifications/" + s.getUser().getId(), note);
        }
    }

    /**
     * Goal pacing nudge: daily at 7 PM. Calculates progress toward weekly goals and
     * suggests adjustments if user is falling behind.
     */
    @Scheduled(cron = "0 0 19 * * ?")
    @Transactional(readOnly = true)
    public void goalPacingNudge() {
        List<User> users = userRepository.findAll();
        LocalDate today = LocalDate.now();
        LocalDate weekEnd = today.with(DayOfWeek.SUNDAY);
        long remainingDays = Duration.between(today.atStartOfDay(), weekEnd.plusDays(1).atStartOfDay()).toDays();

        for (User u : users) {
            List<Goal> weeklyGoals = goalRepository.findActiveByCadence(u.getId(), "WEEKLY");
            for (Goal g : weeklyGoals) {
                if (g.getTargetValue() <= 0) continue;
                double progress = g.getProgressValue() / g.getTargetValue();
                double expected = 1.0 - (remainingDays / 7.0);
                if (progress < expected * 0.7) {
                    double neededPerDay = (g.getTargetValue() - g.getProgressValue()) / Math.max(1, remainingDays);
                    NotificationDto note = new NotificationDto(
                            "GOAL_PACING",
                            "Goal pacing alert",
                            "You're behind on \"" + g.getLabel() + "\". Study " + String.format("%.1f", neededPerDay)
                                    + " " + (g.getUnit() != null ? g.getUnit() : "units") + " per day to catch up.",
                            g.getId(),
                            Instant.now()
                    );
                    messagingTemplate.convertAndSend("/topic/notifications/" + u.getId(), note);
                }
            }
        }
    }
}
