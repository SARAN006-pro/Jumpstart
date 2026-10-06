package com.jumpstart.schedule.session;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface ScheduleSessionRepository extends JpaRepository<ScheduleSession, Long> {

    List<ScheduleSession> findByUserIdAndPlannedStartTimeBetweenOrderByPlannedStartTimeAsc(
        Long userId, Instant start, Instant end
    );

    List<ScheduleSession> findByUserIdAndPlannedStartTimeBetweenAndStatus(
        Long userId, Instant start, Instant end, ScheduleSessionStatus status
    );

    List<ScheduleSession> findByUserIdOrderByPlannedStartTimeDesc(Long userId);

    List<ScheduleSession> findByUserIdAndPlannedStartTimeGreaterThanEqualAndPlannedStartTimeLessThanAndStatus(
        Long userId, Instant start, Instant end, ScheduleSessionStatus status
    );

    List<ScheduleSession> findByUserIdAndPlannedStartTimeLessThanAndActualStartTimeIsNullAndStatus(
        Long userId, Instant threshold, ScheduleSessionStatus status
    );

    @Query("SELECT s FROM ScheduleSession s WHERE s.plannedStartTime >= :start AND s.plannedStartTime < :end AND s.status = :status")
    List<ScheduleSession> findUpcomingInRange(
        @Param("start") Instant start,
        @Param("end") Instant end,
        @Param("status") ScheduleSessionStatus status
    );

    @Query("SELECT s FROM ScheduleSession s WHERE s.plannedStartTime < :threshold AND s.actualStartTime IS NULL AND s.status = :status")
    List<ScheduleSession> findNoShows(
        @Param("threshold") Instant threshold,
        @Param("status") ScheduleSessionStatus status
    );

    List<ScheduleSession> findByStatus(ScheduleSessionStatus status);

    @Query("SELECT s FROM ScheduleSession s WHERE s.user.id = :userId AND s.isAiGenerated = true AND s.confirmationStatus = :confirmation")
    List<ScheduleSession> findAiGeneratedByConfirmation(
        @Param("userId") Long userId,
        @Param("confirmation") ConfirmationStatus confirmation
    );

    void deleteByUserIdAndIsAiGeneratedAndConfirmationStatus(
        Long userId, boolean isAiGenerated, ConfirmationStatus confirmationStatus
    );

    @Query("SELECT COALESCE(AVG(s.actualDuration), 0) FROM ScheduleSession s " +
           "WHERE s.user.id = :userId AND s.status = 'COMPLETED' " +
           "AND s.actualStartTime >= :since")
    Double findAvgActualDurationSince(@Param("userId") Long userId, @Param("since") Instant since);

    @Query("SELECT COALESCE(SUM(s.actualDuration), 0) FROM ScheduleSession s " +
           "WHERE s.user.id = :userId AND s.status = 'COMPLETED' " +
           "AND s.actualStartTime >= :since")
    Long findTotalActualDurationSince(@Param("userId") Long userId, @Param("since") Instant since);

    /* ── Cognitive analysis queries ── */

    @Query("SELECT s FROM ScheduleSession s LEFT JOIN FETCH s.topic t " +
           "WHERE s.user.id = :userId AND s.plannedStartTime >= :since " +
           "ORDER BY s.plannedStartTime ASC")
    List<ScheduleSession> findAllWithTopicSince(@Param("userId") Long userId, @Param("since") Instant since);

    @Query("SELECT s FROM ScheduleSession s " +
           "WHERE s.user.id = :userId AND s.status = 'COMPLETED' AND s.actualStartTime >= :since " +
           "ORDER BY s.actualStartTime ASC")
    List<ScheduleSession> findCompletedSince(@Param("userId") Long userId, @Param("since") Instant since);
}
