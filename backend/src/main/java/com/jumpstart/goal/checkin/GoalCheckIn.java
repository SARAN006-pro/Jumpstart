package com.jumpstart.goal.checkin;

import com.jumpstart.goal.Goal;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.Instant;

@Entity
@Table(name = "goal_checkins")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GoalCheckIn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "goal_id", nullable = false)
    private Goal goal;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private double value;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }
}
