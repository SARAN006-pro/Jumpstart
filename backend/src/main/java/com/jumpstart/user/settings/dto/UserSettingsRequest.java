package com.jumpstart.user.settings.dto;

public record UserSettingsRequest(
        String obsidianVaultName,
        Integer dailyStudyHours,
        String obsidianVaultPath,
        String notesStoragePath,
        String availability
) {}
