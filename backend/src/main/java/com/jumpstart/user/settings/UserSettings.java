package com.jumpstart.user.settings;

import com.jumpstart.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "user_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "obsidian_vault_name", length = 100)
    private String obsidianVaultName;

    @Column(name = "obsidian_vault_path", length = 1000)
    private String obsidianVaultPath;

    @Column(name = "notes_storage_path", length = 1000)
    private String notesStoragePath;

    @Column(name = "sync_enabled")
    @Builder.Default
    private boolean syncEnabled = false;

    @Column(name = "last_sync_at")
    private Instant lastSyncAt;

    @Column(name = "daily_study_hours")
    @Builder.Default
    private int dailyStudyHours = 2;

    @Column(name = "availability", columnDefinition = "TEXT")
    private String availability;

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
