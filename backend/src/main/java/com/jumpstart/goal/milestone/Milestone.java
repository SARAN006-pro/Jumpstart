package com.jumpstart.goal.milestone;

import com.jumpstart.goal.Goal;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "goal_milestones")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Milestone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "goal_id", nullable = false)
    private Goal goal;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "target_percentage", nullable = false)
    private double targetPercentage;

    @Column(name = "is_completed", nullable = false)
    @Builder.Default
    private boolean isCompleted = false;

    @Column(name = "completed_at")
    private Instant completedAt;
}
