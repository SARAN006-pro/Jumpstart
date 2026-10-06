package com.jumpstart.health;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Health check endpoints for Railway and load balancer probes.
 * Provides detailed health information for monitoring.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class HealthController {

    private final DataSource dataSource;

    /**
     * Basic health check - returns 200 if application is running.
     * Used by Railway health checks.
     */
    @GetMapping({"/api/health", "/health"})
    public Map<String, Object> health() {
        return Map.of(
                "status", "UP",
                "service", "jumpstart-backend",
                "timestamp", Instant.now().toString()
        );
    }

    /**
     * Detailed health check with database connectivity.
     * Used for Kubernetes liveness probes and detailed monitoring.
     */
    @GetMapping("/api/health/detailed")
    public Map<String, Object> detailedHealth() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "UP");
        response.put("service", "jumpstart-backend");
        response.put("timestamp", Instant.now().toString());

        // Check database connectivity
        try (Connection conn = dataSource.getConnection()) {
            response.put("database", Map.of(
                    "status", "UP",
                    "url", conn.getMetaData().getURL(),
                    "database", conn.getCatalog()
            ));
        } catch (Exception e) {
            response.put("database", Map.of(
                    "status", "DOWN",
                    "error", e.getMessage()
            ));
            response.put("status", "DEGRADED");
        }

        return response;
    }
}