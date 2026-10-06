package com.jumpstart.schedule.ai;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface MonthlyPlanRepository extends JpaRepository<MonthlyPlan, Long> {

    List<MonthlyPlan> findByUserIdAndMonthKeyOrderByDateAscSortOrderAsc(Long userId, String monthKey);

    List<MonthlyPlan> findByUserIdAndDateOrderBySortOrderAsc(Long userId, LocalDate date);

    @Query("SELECT COUNT(m) > 0 FROM MonthlyPlan m WHERE m.user.id = :userId AND m.monthKey = :monthKey")
    boolean existsByUserIdAndMonthKey(@Param("userId") Long userId, @Param("monthKey") String monthKey);

    void deleteByUserIdAndMonthKey(Long userId, String monthKey);
}
