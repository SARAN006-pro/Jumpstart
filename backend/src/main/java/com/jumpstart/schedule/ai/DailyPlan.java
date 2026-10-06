package com.jumpstart.schedule.ai;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.jumpstart.user.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.Instant;

@Entity
@Table(name = "daily_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false, length = 300)
    private String taskTitle;

    @Column(name = "topic_id")
    private Long topicId;

    @Column(name = "topic_title", length = 200)
    private String topicTitle;

    @Column(name = "goal_id")
    private Long goalId;

    @Column(name = "goal_title", length = 200)
    private String goalTitle;

    @Column(name = "estimated_minutes")
    private int estimatedMinutes;

    @Column(name = "sort_order")
    private int sortOrder;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "difficulty", length = 20)
    @Builder.Default
    private String difficulty = "BEGINNER";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
