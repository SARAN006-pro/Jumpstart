package com.jumpstart.goal.streak;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StreakFreezeRepository extends JpaRepository<StreakFreeze, Long> {

    List<StreakFreeze> findByUserId(Long userId);

    Optional<StreakFreeze> findByUserIdAndUsedDate(Long userId, LocalDate date);

    long countByUserIdAndIsUsedFalse(Long userId);
}
