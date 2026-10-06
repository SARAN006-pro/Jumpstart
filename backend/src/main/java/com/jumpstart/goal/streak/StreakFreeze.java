package com.jumpstart.goal.streak;

import com.jumpstart.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "streak_freezes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StreakFreeze {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "used_date", nullable = false)
    private LocalDate usedDate;

    @Column(name = "is_used", nullable = false)
    @Builder.Default
    private boolean isUsed = false;
}
