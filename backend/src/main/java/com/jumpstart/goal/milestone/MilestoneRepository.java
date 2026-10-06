package com.jumpstart.goal.milestone;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MilestoneRepository extends JpaRepository<Milestone, Long> {

    List<Milestone> findByGoalIdOrderByTargetPercentageAsc(Long goalId);

    List<Milestone> findByGoalIdAndIsCompletedFalseOrderByTargetPercentageAsc(Long goalId);
}
