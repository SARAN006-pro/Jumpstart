package com.jumpstart.goal;

import com.jumpstart.goal.dto.GoalProjectionResponse;
import com.jumpstart.schedule.session.ScheduleSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoalProjectionService {

    private final GoalRepository goalRepository;
    private final ScheduleSessionRepository sessionRepository;

    public List<GoalProjectionResponse> getProjections(Long userId) {
        List<Goal> activeGoals = goalRepository.findByOwnerIdAndStatusOrderByDueDateAsc(userId, "active");
        List<GoalProjectionResponse> projections = new ArrayList<>();

        // Calculate pace: avg daily minutes over last 14 days
        Instant twoWeeksAgo = Instant.now().minus(14, ChronoUnit.DAYS);
        double avgDailyMinutes = sessionRepository.findAvgActualDurationSince(userId, twoWeeksAgo);
        // Normalize: avgDailyMinutes is per-session avg, we need per-day avg
        double totalMinutes14d = sessionRepository.findTotalActualDurationSince(userId, twoWeeksAgo);
        double dailyPaceMinutes = totalMinutes14d / 14.0;

        LocalDate today = LocalDate.now(ZoneId.systemDefault());

        for (Goal goal : activeGoals) {
            double remaining = goal.getTargetValue() - goal.getProgressValue();
            if (remaining <= 0) continue;

            double paceValuePerDay = 0;
            String unit = "sessions";
            if ("HOURS".equals(goal.getMetricType()) || "MINUTES".equals(goal.getMetricType())) {
                double minPerDay = goal.getMetricType().equals("HOURS") ? dailyPaceMinutes / 60.0 : dailyPaceMinutes;
                paceValuePerDay = Math.max(minPerDay, 0.25); // floor 15 min/day
                unit = goal.getMetricType().equals("HOURS") ? "hours" : "minutes";
            } else {
                // Default: count-based, use completed session count as proxy
                long recentSessions = sessionRepository.findTotalActualDurationSince(userId, twoWeeksAgo);
                paceValuePerDay = Math.max(recentSessions / 14.0, 0.2);
            }

            int estimatedDays = (int) Math.ceil(remaining / paceValuePerDay);
            LocalDate projectedDate = today.plusDays(estimatedDays);
            boolean onTrack = goal.getDueDate() == null || !projectedDate.isAfter(goal.getDueDate());

            String insight = buildInsight(goal, remaining, estimatedDays, projectedDate, onTrack, dailyPaceMinutes);

            projections.add(new GoalProjectionResponse(
                    goal.getId(), goal.getLabel(),
                    goal.getTargetValue(), goal.getProgressValue(),
                    remaining, unit, goal.getDueDate(),
                    dailyPaceMinutes, estimatedDays, projectedDate,
                    onTrack, insight
            ));
        }

        return projections;
    }

    private String buildInsight(Goal goal, double remaining, int estimatedDays,
                                 LocalDate projectedDate, boolean onTrack, double dailyPaceMinutes) {
        if (goal.getDueDate() == null) {
            if (estimatedDays <= 7) return "Almost there! ~" + estimatedDays + " days at current pace.";
            return "On track to finish in ~" + estimatedDays + " days. Keep it up!";
        }
        if (onTrack) {
            long buffer = ChronoUnit.DAYS.between(projectedDate, goal.getDueDate());
            if (buffer > 0) return "On track. Projected " + projectedDate + " — " + buffer + " days ahead of deadline.";
            return "On track to finish by the " + goal.getDueDate() + " deadline.";
        }
        long overdue = ChronoUnit.DAYS.between(goal.getDueDate(), projectedDate);
        int extraMinPerDay = (int) Math.ceil((remaining / Math.max(1, ChronoUnit.DAYS.between(LocalDate.now(ZoneId.systemDefault()), goal.getDueDate()))) * 60 - dailyPaceMinutes);
        extraMinPerDay = Math.max(extraMinPerDay, 5);
        return "Behind schedule by ~" + overdue + " days. Add " + extraMinPerDay + " min/day to get back on track.";
    }
}
