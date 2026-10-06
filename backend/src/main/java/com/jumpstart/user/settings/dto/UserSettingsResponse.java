package com.jumpstart.user.settings.dto;

import com.jumpstart.user.settings.UserSettings;

import java.time.Instant;

public record UserSettingsResponse(
        Long id,
        String obsidianVaultName,
        int dailyStudyHours,
        String obsidianVaultPath,
        boolean syncEnabled,
        Instant lastSyncAt,
        String notesStoragePath,
        String availability
) {
    public static UserSettingsResponse from(UserSettings s) {
        return new UserSettingsResponse(
                s.getId(),
                s.getObsidianVaultName(),
                s.getDailyStudyHours(),
                s.getObsidianVaultPath(),
                s.isSyncEnabled(),
                s.getLastSyncAt(),
                s.getNotesStoragePath(),
                s.getAvailability()
        );
    }
}
