package com.jumpstart.topic.progress;

import com.jumpstart.topic.Topic;
import com.jumpstart.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "topic_progress",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "topic_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TopicProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "topic_id", nullable = false)
    private Topic topic;

    @Column(name = "confidence_level", nullable = false)
    @Builder.Default
    private int confidenceLevel = 1;

    @Column(name = "last_revised_at")
    private Instant lastRevisedAt;

    @Column(name = "total_study_minutes", nullable = false)
    @Builder.Default
    private int totalStudyMinutes = 0;

    @Column(name = "session_count", nullable = false)
    @Builder.Default
    private int sessionCount = 0;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
