package com.jumpstart.user.settings;

import com.jumpstart.common.exception.ResourceNotFoundException;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import com.jumpstart.user.settings.dto.UserSettingsRequest;
import com.jumpstart.user.settings.dto.UserSettingsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
@RequiredArgsConstructor
public class SettingsService {

    private final UserSettingsRepository repository;
    private final UserRepository userRepository;

    @Transactional
    public UserSettingsResponse save(String obsidianVaultName, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        UserSettings settings = repository.findByUserId(userId)
                .orElse(UserSettings.builder().user(user).build());
        settings.setObsidianVaultName(obsidianVaultName);
        return UserSettingsResponse.from(repository.save(settings));
    }

    @Transactional
    public UserSettingsResponse saveVaultConfig(String vaultName, String vaultPath, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        UserSettings settings = repository.findByUserId(userId)
                .orElse(UserSettings.builder().user(user).build());
        if (vaultName != null) settings.setObsidianVaultName(vaultName);
        if (vaultPath != null) settings.setObsidianVaultPath(vaultPath);
        if (vaultPath != null && !vaultPath.isEmpty()) {
            settings.setSyncEnabled(true);
        }
        return UserSettingsResponse.from(repository.save(settings));
    }

    @Transactional
    public UserSettingsResponse saveNotesStoragePath(String notesStoragePath, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        UserSettings settings = repository.findByUserId(userId)
                .orElse(UserSettings.builder().user(user).build());
        settings.setNotesStoragePath(notesStoragePath);
        return UserSettingsResponse.from(repository.save(settings));
    }

    public void testNotesStoragePath(Long userId) throws IOException {
        UserSettings settings = repository.findByUserId(userId).orElse(null);
        if (settings == null || settings.getNotesStoragePath() == null || settings.getNotesStoragePath().isEmpty()) {
            throw new IllegalStateException("No notes storage path configured");
        }
        Path path = Paths.get(settings.getNotesStoragePath());
        if (!Files.exists(path)) {
            throw new IOException("Path does not exist: " + settings.getNotesStoragePath());
        }
        if (!Files.isDirectory(path)) {
            throw new IOException("Path is not a directory: " + settings.getNotesStoragePath());
        }
        // Test write permission
        Path testFile = path.resolve(".jumpstart_write_test");
        try {
            Files.writeString(testFile, "test", StandardCharsets.UTF_8);
            Files.deleteIfExists(testFile);
        } catch (IOException e) {
            throw new IOException("Path is not writable: " + settings.getNotesStoragePath());
        }
    }

    @Transactional
    public void enableSync(Long userId, boolean enabled) {
        UserSettings settings = repository.findByUserId(userId).orElse(null);
        if (settings != null) {
            settings.setSyncEnabled(enabled);
            repository.save(settings);
        }
    }

    public UserSettingsResponse get(Long userId) {
        return repository.findByUserId(userId)
                .map(UserSettingsResponse::from)
                .orElse(new UserSettingsResponse(null, null, 2, null, false, null, null, null));
    }

    public UserSettings getSettings(Long userId) {
        return repository.findByUserId(userId)
                .orElse(null);
    }

    @Transactional
    public UserSettingsResponse update(UserSettingsRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        UserSettings settings = repository.findByUserId(userId)
                .orElse(UserSettings.builder().user(user).build());
        if (request.obsidianVaultName() != null) {
            settings.setObsidianVaultName(request.obsidianVaultName());
        }
        if (request.dailyStudyHours() != null) {
            settings.setDailyStudyHours(request.dailyStudyHours());
        }
        if (request.obsidianVaultPath() != null) {
            settings.setObsidianVaultPath(request.obsidianVaultPath());
        }
        if (request.availability() != null) {
            settings.setAvailability(request.availability());
        }
        return UserSettingsResponse.from(repository.save(settings));
    }
}
