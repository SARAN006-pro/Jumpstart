package com.jumpstart.topic.timer;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.jumpstart.topic.Topic;
import com.jumpstart.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "topic_timer_sessions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TopicTimerSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "topic_id", nullable = false)
    private Topic topic;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "start_time")
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "is_manual", nullable = false)
    @Builder.Default
    private boolean isManual = false;

    @Column(name = "note", length = 255)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
