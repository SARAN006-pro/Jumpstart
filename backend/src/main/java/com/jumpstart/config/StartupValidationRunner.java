package com.jumpstart.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@Order(Integer.MIN_VALUE)
@RequiredArgsConstructor
public class StartupValidationRunner implements ApplicationRunner {

    private static final String[] RAILWAY_DB_VARS = {
        "DB_HOST", "DB_PORT", "DB_NAME", "DB_USERNAME", "DB_PASSWORD"
    };

    private static final String[] RAILWAY_OTHER_VARS = {
        "PORT", "JWT_SECRET", "CORS_ALLOWED_ORIGINS", "SPRING_PROFILES_ACTIVE"
    };

    private final DataSource dataSource;

    @Value("${spring.profiles.active:unknown}")
    private String activeProfile;

    @Value("${jumpstart.security.jwt.secret:}")
    private String jwtSecret;

    @Value("${jumpstart.cors.allowed-origins:}")
    private String corsAllowedOrigins;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        boolean isProduction = "prod".equalsIgnoreCase(activeProfile);

        log.info("=".repeat(60));
        log.info("STARTUP VALIDATION - Profile: {}, Production: {}", activeProfile, isProduction);
        log.info("=".repeat(60));

        log.info("Server port: {}", System.getenv("PORT"));
        log.info("OS: {} {}", System.getProperty("os.name"), System.getProperty("os.version"));
        log.info("Java: {} {}", System.getProperty("java.version"), System.getProperty("java.vendor"));
        log.info("Processors: {}", Runtime.getRuntime().availableProcessors());
        log.info("Max memory: {} MB", Runtime.getRuntime().maxMemory() / 1024 / 1024);

        validateRailwayEnvVars(errors, warnings, isProduction);
        validateDatabaseConnectivity(warnings, isProduction);
        validateJwtConfig(errors, warnings, isProduction);
        validateCorsConfig(warnings);

        if (!errors.isEmpty()) {
            log.error("-".repeat(60));
            log.error("STARTUP VALIDATION FAILED - {} error(s)", errors.size());
            log.error("-".repeat(60));
            errors.forEach(error -> log.error("  FAIL: {}", error));
            log.error("-".repeat(60));

            if (isProduction) {
                boolean dbConnected = false;
                try (Connection conn = dataSource.getConnection()) {
                    dbConnected = true;
                } catch (Exception ignored) {}

                if (!dbConnected) {
                    throw new IllegalStateException(
                        "Startup validation failed. Fix these issues before deployment:\n" +
                        String.join("\n", errors)
                    );
                } else {
                    log.warn("Startup validation reported errors, but database connection is healthy. Continuing startup.");
                }
            } else {
                log.warn("  Continuing in {} mode despite errors", activeProfile);
            }
        }

        if (!warnings.isEmpty()) {
            log.warn("-".repeat(60));
            log.warn("STARTUP VALIDATION WARNINGS - {} warning(s)", warnings.size());
            log.warn("-".repeat(60));
            warnings.forEach(w -> log.warn("  WARN: {}", w));
            log.warn("-".repeat(60));
        }

        if (errors.isEmpty()) {
            log.info("  ALL CHECKS PASSED");
        }
    }

    private void validateRailwayEnvVars(List<String> errors, List<String> warnings, boolean isProduction) {
        log.info("-- Database Environment Variables --");
        String datasourceUrl = System.getenv("SPRING_DATASOURCE_URL");
        if (datasourceUrl == null || datasourceUrl.isBlank()) {
            datasourceUrl = System.getenv("DATABASE_URL");
        }
        boolean hasDirectUrl = datasourceUrl != null && !datasourceUrl.isBlank();

        for (String var : RAILWAY_DB_VARS) {
            String val = System.getenv(var);
            if (val == null || val.isBlank()) {
                String msg = "Missing environment variable: " + var;
                if (isProduction && !hasDirectUrl) {
                    errors.add(msg);
                } else {
                    warnings.add(msg);
                }
                log.warn("  {}: NOT SET", var);
            } else {
                log.info("  {}: {}", var, "DB_PASSWORD".equals(var) ? "****" : val);
            }
        }

        for (String var : RAILWAY_OTHER_VARS) {
            String val = System.getenv(var);
            if (val == null || val.isBlank()) {
                warnings.add("Missing environment variable: " + var);
                log.warn("  {}: NOT SET", var);
            } else {
                log.info("  {}: {}", var, "JWT_SECRET".equals(var) ? "****" : val);
            }
        }

        if (errors.isEmpty()) {
            log.info("  All Railway environment variables present");
        }
    }

    private void validateDatabaseConnectivity(List<String> warnings, boolean isProduction) {
        log.info("-- Database Connectivity --");
        try (Connection conn = dataSource.getConnection()) {
            log.info("  Connected to: {}", conn.getMetaData().getURL());
            log.info("  Database product: {} {}", conn.getMetaData().getDatabaseProductName(),
                     conn.getMetaData().getDatabaseProductVersion());
            log.info("  Connection OK");
        } catch (Exception e) {
            String msg = "Database connection failed: " + e.getMessage() +
                         " (HikariCP will retry in background)";
            warnings.add(msg);
            log.warn("  {}", msg);
        }
    }

    private void validateJwtConfig(List<String> errors, List<String> warnings, boolean isProduction) {
        log.info("-- JWT Configuration --");
        if (jwtSecret == null || jwtSecret.isBlank()) {
            String msg = "JWT_SECRET is not set";
            warnings.add(msg);
            log.warn("  {}", msg);
        } else {
            log.info("  JWT_SECRET length: {} characters", jwtSecret.length());
        }

        if (isProduction && (jwtSecret == null || jwtSecret.length() < 32)) {
            errors.add("JWT_SECRET must be at least 32 characters in production");
        }
    }

    private void validateCorsConfig(List<String> warnings) {
        log.info("-- CORS Configuration --");
        if (corsAllowedOrigins == null || corsAllowedOrigins.isBlank()) {
            warnings.add("CORS_ALLOWED_ORIGINS is not set - cross-origin requests will be rejected");
            log.warn("  CORS_ALLOWED_ORIGINS: NOT SET");
        } else {
            String[] origins = corsAllowedOrigins.split(",");
            for (String origin : origins) {
                String trimmed = origin.trim();
                if (!trimmed.isEmpty()) {
                    log.info("  Allowed origin: {}", trimmed);
                }
            }
        }
    }
}
