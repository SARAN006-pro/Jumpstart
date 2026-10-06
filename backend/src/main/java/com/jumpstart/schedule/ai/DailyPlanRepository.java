package com.jumpstart.schedule.ai;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface DailyPlanRepository extends JpaRepository<DailyPlan, Long> {

    List<DailyPlan> findByUserIdAndDateOrderBySortOrderAsc(Long userId, LocalDate date);

    @Query("SELECT d FROM DailyPlan d WHERE d.user.id = :userId AND d.date BETWEEN :start AND :end ORDER BY d.date, d.sortOrder")
    List<DailyPlan> findByUserIdAndDateRange(@Param("userId") Long userId, @Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT d FROM DailyPlan d WHERE d.user.id = :userId AND d.date = :date AND d.status = 'PENDING' ORDER BY d.sortOrder")
    List<DailyPlan> findPendingByDate(@Param("userId") Long userId, @Param("date") LocalDate date);

    void deleteByUserIdAndDate(Long userId, LocalDate date);
}
