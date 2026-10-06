package com.jumpstart.schedule.session;

import com.jumpstart.resource.ResourceItem;
import com.jumpstart.topic.Topic;
import com.jumpstart.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "schedule_sessions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ScheduleSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 240)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id")
    private Topic topic;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_id")
    private ResourceItem resource;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ScheduleSessionStatus status = ScheduleSessionStatus.PLANNED;

    @Column(name = "planned_start_time", nullable = false)
    private Instant plannedStartTime;

    @Column(name = "planned_end_time", nullable = false)
    private Instant plannedEndTime;

    @Column(name = "actual_start_time")
    private Instant actualStartTime;

    @Column(name = "actual_end_time")
    private Instant actualEndTime;

    @Column(name = "actual_duration")
    private Integer actualDuration;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String timezone = "UTC";

    @Column(name = "recurrence_rule", length = 500)
    private String recurrenceRule;

    @Column(name = "original_series_id")
    private Long originalSeriesId;

    @Column(name = "pomodoro_count", nullable = false)
    @Builder.Default
    private int pomodoroCount = 0;

    @Column(name = "is_ai_generated", nullable = false)
    @Builder.Default
    private boolean isAiGenerated = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "confirmation_status", nullable = false, length = 20)
    @Builder.Default
    private ConfirmationStatus confirmationStatus = ConfirmationStatus.CONFIRMED;

    @Column
    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }
}
