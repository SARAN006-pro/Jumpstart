package com.jumpstart.goal.checkin;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface GoalCheckInRepository extends JpaRepository<GoalCheckIn, Long> {

    List<GoalCheckIn> findByGoalIdOrderByDateDesc(Long goalId);

    Optional<GoalCheckIn> findByGoalIdAndDate(Long goalId, LocalDate date);

    boolean existsByGoalIdAndDate(Long goalId, LocalDate date);
}
