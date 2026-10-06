package com.jumpstart.goal;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface GoalRepository extends JpaRepository<Goal, Long> {
    Page<Goal> findByOwnerId(Long ownerId, Pageable pageable);
    Page<Goal> findByOwnerIdAndCadence(Long ownerId, Cadence cadence, Pageable pageable);
    Page<Goal> findByOwnerIdAndStatus(Long ownerId, String status, Pageable pageable);
    Page<Goal> findByOwnerIdAndTopicId(Long ownerId, Long topicId, Pageable pageable);
    List<Goal> findByOwnerId(Long ownerId);
    List<Goal> findByOwnerIdAndTopicId(Long ownerId, Long topicId);
    List<Goal> findByOwnerIdAndTopicIdAndStatus(Long ownerId, Long topicId, String status);

    List<Goal> findByOwnerIdAndStatusAndTrackingType(Long ownerId, String status, String trackingType);

    @Query("SELECT g FROM Goal g WHERE g.owner.id = :userId AND g.status = 'active' AND g.trackingType = 'AUTOMATIC' AND g.linkedRoadmap.id = :roadmapId")
    List<Goal> findActiveAutomaticByRoadmap(@Param("userId") Long userId, @Param("roadmapId") Long roadmapId);

    @Query("SELECT g FROM Goal g WHERE g.owner.id = :userId AND g.status = 'active' AND g.cadence = 'DAILY' AND g.trackingType = 'MANUAL' AND (g.lastCheckedInDate IS NULL OR g.lastCheckedInDate < :today)")
    List<Goal> findDailyManualNotCheckedIn(@Param("userId") Long userId, @Param("today") LocalDate today);

    @Query("SELECT g FROM Goal g WHERE g.owner.id = :userId AND g.status = 'active' AND g.progressValue < g.targetValue AND g.dueDate IS NOT NULL AND g.dueDate <= :deadline")
    List<Goal> findAtRiskGoals(@Param("userId") Long userId, @Param("deadline") LocalDate deadline);

    @Query("SELECT g FROM Goal g WHERE g.owner.id = :userId AND g.cadence = :cadence AND g.completedAt IS NULL")
    List<Goal> findActiveByCadence(@Param("userId") Long userId, @Param("cadence") String cadence);

    @Query("SELECT g FROM Goal g WHERE g.owner.id = :userId AND g.status = :status ORDER BY g.dueDate ASC NULLS LAST")
    List<Goal> findByOwnerIdAndStatusOrderByDueDateAsc(@Param("userId") Long userId, @Param("status") String status);
}
