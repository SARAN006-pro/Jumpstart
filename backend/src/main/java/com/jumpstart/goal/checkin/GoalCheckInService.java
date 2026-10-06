package com.jumpstart.goal.checkin;

import com.jumpstart.goal.Goal;
import com.jumpstart.goal.GoalRepository;
import com.jumpstart.goal.GoalEngineService;
import com.jumpstart.schedule.session.ScheduleSession;
import com.jumpstart.schedule.session.ScheduleSessionRepository;
import com.jumpstart.schedule.session.ScheduleSessionStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GoalCheckInService {

    private final GoalCheckInRepository checkInRepository;
    private final GoalRepository goalRepository;
    private final GoalEngineService goalEngine;
    private final ScheduleSessionRepository sessionRepository;

    public List<GoalCheckIn> getCheckIns(Long goalId) {
        return checkInRepository.findByGoalIdOrderByDateDesc(goalId);
    }

    @Transactional
    public GoalCheckIn submitCheckIn(Long goalId, Long userId, double value, String notes, LocalDate date) {
        Goal goal = goalRepository.findById(goalId)
            .orElseThrow(() -> new RuntimeException("Goal not found"));

        if (!goal.getOwner().getId().equals(userId)) {
            throw new RuntimeException("Not your goal");
        }

        GoalCheckIn checkIn = checkInRepository.findByGoalIdAndDate(goalId, date)
            .orElse(null);

        if (checkIn != null) {
            checkIn.setValue(value);
            checkIn.setNotes(notes);
            checkIn = checkInRepository.save(checkIn);
        } else {
            checkIn = GoalCheckIn.builder()
                .goal(goal)
                .date(date)
                .value(value)
                .notes(notes)
                .build();
            checkIn = checkInRepository.save(checkIn);
        }

        goal.setProgressValue(goal.getProgressValue() + value);
        goalEngine.processStreakAndNotifications(goal, goal.getProgressValue() - value, goal.getProgressValue());
        goalRepository.save(goal);

        return checkIn;
    }

    @Transactional
    public GoalCheckIn retroactiveLog(Long goalId, Long userId, double durationMinutes, LocalDate date, String notes) {
        Goal goal = goalRepository.findById(goalId)
            .orElseThrow(() -> new RuntimeException("Goal not found"));

        if (!goal.getOwner().getId().equals(userId)) {
            throw new RuntimeException("Not your goal");
        }

        GoalCheckIn checkIn = GoalCheckIn.builder()
            .goal(goal)
            .date(date)
            .value(durationMinutes)
            .notes(notes)
            .build();
        checkIn = checkInRepository.save(checkIn);

        ZoneId zone = ZoneId.systemDefault();
        LocalDate logDate = date;
        Instant startInstant = logDate.atTime(LocalTime.now().minusMinutes((long) durationMinutes)).atZone(zone).toInstant();
        Instant endInstant = logDate.atTime(LocalTime.now()).atZone(zone).toInstant();

        ScheduleSession session = ScheduleSession.builder()
            .user(goal.getOwner())
            .title("Retro: " + goal.getLabel())
            .topic(goal.getTopic())
            .status(ScheduleSessionStatus.COMPLETED)
            .actualStartTime(startInstant)
            .actualEndTime(endInstant)
            .actualDuration((int) durationMinutes)
            .isAiGenerated(false)
            .build();
        sessionRepository.save(session);

        goal.setProgressValue(goal.getProgressValue() + durationMinutes);
        goal.setLastCheckedInDate(date);
        goalEngine.processStreakAndNotifications(goal, goal.getProgressValue() - durationMinutes, goal.getProgressValue());
        goalRepository.save(goal);

        return checkIn;
    }
}
