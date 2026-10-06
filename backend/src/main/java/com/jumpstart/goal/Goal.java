package com.jumpstart.goal;

import com.jumpstart.common.audit.Auditable;
import com.jumpstart.roadmap.Roadmap;
import com.jumpstart.topic.Topic;
import com.jumpstart.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.Instant;

@Entity
@Table(name = "goals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Goal extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, length = 160)
    private String label;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Cadence cadence;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String priority = "medium";

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "active";

    @Column(name = "target_value", nullable = false)
    private double targetValue;

    @Column(name = "progress_value", nullable = false)
    @Builder.Default
    private double progressValue = 0;

    @Column(length = 30)
    private String unit;

    @Column(name = "metric_type", length = 20)
    @Builder.Default
    private String metricType = "HOURS";

    @Column(name = "tracking_type", length = 20)
    @Builder.Default
    private String trackingType = "MANUAL";

    @Column(name = "due_date")
    private LocalDate dueDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id")
    private Topic topic;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roadmap_id")
    private Roadmap linkedRoadmap;

    @Column(name = "streak_count", nullable = false)
    @Builder.Default
    private int streakCount = 0;

    @Column(name = "best_streak", nullable = false)
    @Builder.Default
    private int bestStreak = 0;

    @Column(name = "last_checked_in_date")
    private LocalDate lastCheckedInDate;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "prerequisite_goal_id")
    private Long prerequisiteGoalId;

    @Column(name = "unlock_threshold")
    private Double unlockThreshold;
}
