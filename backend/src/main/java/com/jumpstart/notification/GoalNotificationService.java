package com.jumpstart.notification;

import com.jumpstart.goal.Goal;
import com.jumpstart.goal.GoalRepository;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoalNotificationService {

    private final GoalRepository goalRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Scheduled(cron = "0 0 20 * * ?")
    @Transactional(readOnly = true)
    public void dailyGoalWatchdog() {
        LocalDate today = LocalDate.now();
        List<User> allUsers = userRepository.findAll();

        for (User user : allUsers) {
            List<Goal> activeDaily = goalRepository
                .findDailyManualNotCheckedIn(user.getId(), today);

            for (Goal g : activeDaily) {
                double remaining = g.getTargetValue() - g.getProgressValue();
                if (remaining > 0) {
                    String unit = g.getUnit() != null ? g.getUnit() : "units";
                    sendNotification(user.getId(), "GOAL_AT_RISK",
                        "Daily goal at risk!",
                        "You still need " + String.format("%.1f", remaining) + " " + unit
                            + " for \"" + g.getLabel() + "\" today");
                }
            }
        }
    }

    @Scheduled(cron = "0 0 9 * * ?")
    @Transactional(readOnly = true)
    public void deadlineAlert() {
        List<User> allUsers = userRepository.findAll();
        LocalDate threeDays = LocalDate.now().plusDays(3);

        for (User user : allUsers) {
            List<Goal> atRisk = goalRepository
                .findAtRiskGoals(user.getId(), threeDays);

            for (Goal g : atRisk) {
                sendNotification(user.getId(), "DEADLINE_APPROACHING",
                    "Deadline approaching!",
                    "\"" + g.getLabel() + "\" is due " + g.getDueDate()
                        + " — only " + String.format("%.0f", g.getProgressValue() / g.getTargetValue() * 100) + "% done");
            }
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
