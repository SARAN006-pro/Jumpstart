package com.jumpstart;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.io.File;
import java.nio.file.Files;
import java.util.List;

@SpringBootApplication
@EnableJpaAuditing
@EnableScheduling
public class JumpstartApplication {
    public static void main(String[] args) {
        loadDotenvIfPresent();
        SpringApplication.run(JumpstartApplication.class, args);
    }

    private static void loadDotenvIfPresent() {
        File envFile = new File(".env");
        if (!envFile.exists()) {
            envFile = new File("backend/.env");
        }
        if (envFile.exists() && envFile.isFile()) {
            try {
                List<String> lines = Files.readAllLines(envFile.toPath());
                for (String line : lines) {
                    String trimmed = line.trim();
                    if (trimmed.isEmpty() || trimmed.startsWith("#") || !trimmed.contains("=")) {
                        continue;
                    }
                    int eqIdx = trimmed.indexOf('=');
                    String key = trimmed.substring(0, eqIdx).trim();
                    String value = trimmed.substring(eqIdx + 1).trim();
                    if (System.getProperty(key) == null && System.getenv(key) == null) {
                        System.setProperty(key, value);
                    }
                }
            } catch (Exception ignored) {
            }
        }
    }
}
