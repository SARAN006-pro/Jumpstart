package com.jumpstart.note;

import com.jumpstart.common.audit.Auditable;
import com.jumpstart.roadmap.Roadmap;
import com.jumpstart.topic.Topic;
import com.jumpstart.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "notes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Note extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roadmap_id")
    private Roadmap roadmap;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id")
    private Topic topic;

    @Column(nullable = false, length = 200)
    private String title;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "word_count", nullable = false)
    @Builder.Default
    private int wordCount = 0;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(name = "obsidian_uri", length = 500)
    private String obsidianUri;

    @Column(name = "obsidian_file", length = 255)
    private String obsidianFile;

    @Column(name = "is_starred", nullable = false)
    @Builder.Default
    private boolean isStarred = false;

    @Column(name = "is_pinned", nullable = false)
    @Builder.Default
    private boolean isPinned = false;

    @Column(name = "last_viewed_at")
    private Instant lastViewedAt;

    @Column(name = "vault_path", length = 1000)
    private String vaultPath;

    @Column(name = "checksum", length = 64)
    private String checksum;

    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;

    @Column(name = "sync_status", length = 20)
    @Builder.Default
    private String syncStatus = "NONE";

    @Lob
    @Column(name = "conflict_content", columnDefinition = "TEXT")
    private String conflictContent;

    @Column(name = "conflict_detected_at")
    private Instant conflictDetectedAt;

    @ElementCollection
    @CollectionTable(name = "note_tags", joinColumns = @JoinColumn(name = "note_id"))
    @Column(name = "tag", length = 60)
    @Builder.Default
    private List<String> tags = new ArrayList<>();
}
