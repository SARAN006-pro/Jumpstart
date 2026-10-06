package com.jumpstart.analytics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.jumpstart.analytics.dto.CognitiveAnalysisResponse;
import com.jumpstart.schedule.session.ScheduleSession;
import com.jumpstart.schedule.session.ScheduleSessionRepository;
import com.jumpstart.schedule.session.ScheduleSessionStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CognitiveAnalysisService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final ScheduleSessionRepository sessionRepository;

    @Value("${jumpstart.ai.groq-api-key:}")
    private String defaultGroqApiKey;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL = "llama-3.3-70b-versatile";

    @Transactional(readOnly = true)
    public CognitiveAnalysisResponse analyze(Long userId) {
        Instant since = Instant.now().minus(30, ChronoUnit.DAYS);
        List<ScheduleSession> sinceSessions = sessionRepository.findAllWithTopicSince(userId, since);

        /* ── Aggregate stats ── */
        List<ScheduleSession> completed = sinceSessions.stream()
                .filter(s -> s.getStatus() == ScheduleSessionStatus.COMPLETED)
                .toList();

        double avgMinutes = completed.stream()
                .filter(s -> s.getActualDuration() != null)
                .mapToInt(s -> s.getActualDuration())
                .average().orElse(0);

        long totalMins = completed.stream()
                .filter(s -> s.getActualDuration() != null)
                .mapToLong(s -> s.getActualDuration())
                .sum();

        /* Streaks: count consecutive days with completed sessions */
        List<LocalDate> activeDates = completed.stream()
                .filter(s -> s.getActualStartTime() != null)
                .map(s -> LocalDate.ofInstant(s.getActualStartTime(), ZoneId.systemDefault()))
                .distinct()
                .sorted()
                .toList();

        int longestStreak = 0, currentStreak = 0, streakRun = 0;
        LocalDate prev = null;
        for (LocalDate d : activeDates) {
            if (prev != null && d.equals(prev.plusDays(1))) {
                streakRun++;
            } else {
                streakRun = 1;
            }
            longestStreak = Math.max(longestStreak, streakRun);
            prev = d;
        }
        if (!activeDates.isEmpty()) {
            LocalDate last = activeDates.getLast();
            currentStreak = last.equals(LocalDate.now()) || last.equals(LocalDate.now().minusDays(1))
                    ? (int) ChronoUnit.DAYS.between(last, LocalDate.now()) + 1 : 0;
        }

        /* ── Build prompt context ── */
        var diffStats = buildDifficultyStats(sinceSessions);
        var todStats = buildTimeOfDayStats(completed);
        int switchFreq = countTopicSwitches(sinceSessions);

        String prompt = buildAnalysisPrompt(avgMinutes, completed.size(), totalMins,
                longestStreak, currentStreak, diffStats, todStats, switchFreq);

        /* ── Call Groq ── */
        try {
            String raw = callGroq(prompt);
            return parseResponse(raw, avgMinutes, completed.size(), totalMins, longestStreak, currentStreak);
        } catch (Exception e) {
            log.error("Groq cognitive analysis failed, using fallback", e);
            return fallbackAnalysis(avgMinutes, completed.size(), totalMins, longestStreak, currentStreak);
        }
    }

    private Map<Integer, long[]> buildDifficultyStats(List<ScheduleSession> sessions) {
        Map<Integer, long[]> map = new HashMap<>();
        for (int d = 1; d <= 3; d++) map.put(d, new long[]{0, 0});
        for (var s : sessions) {
            int diff = s.getTopic() != null ? s.getTopic().getDifficulty() : 0;
            map.putIfAbsent(diff, new long[]{0, 0});
            map.get(diff)[0]++;
            if (s.getStatus() == ScheduleSessionStatus.COMPLETED) map.get(diff)[1]++;
        }
        return map;
    }

    private Map<Integer, Long> buildTimeOfDayStats(List<ScheduleSession> completed) {
        return completed.stream()
                .filter(s -> s.getActualStartTime() != null)
                .collect(Collectors.groupingBy(
                        s -> s.getActualStartTime().atZone(ZoneId.systemDefault()).getHour(),
                        Collectors.counting()
                ));
    }

    private int countTopicSwitches(List<ScheduleSession> sessions) {
        int switches = 0;
        Long prevTopicId = null;
        for (var s : sessions) {
            Long tid = s.getTopic() != null ? s.getTopic().getId() : null;
            if (prevTopicId != null && tid != null && !tid.equals(prevTopicId)) switches++;
            if (tid != null) prevTopicId = tid;
        }
        return switches;
    }

    private String buildAnalysisPrompt(double avgMin, long totalSessions, long totalMins,
                                       int longestStreak, int currentStreak,
                                       Map<Integer, long[]> diffStats,
                                       Map<Integer, Long> todStats, int topicSwitches) {
        StringBuilder sb = new StringBuilder();
        sb.append("Analyze this student's study data over the last 30 days:\n\n");
        sb.append(String.format("- Average session: %.0f min\n", avgMin));
        sb.append("- Completed sessions: ").append(totalSessions).append("\n");
        sb.append("- Total focus time: ").append(totalMins).append(" min\n");
        sb.append("- Longest streak: ").append(longestStreak).append(" days\n");
        sb.append("- Current streak: ").append(currentStreak).append(" days\n");
        sb.append("- Topic switches: ").append(topicSwitches).append("\n\n");

        sb.append("Completion rate by difficulty:\n");
        for (var e : diffStats.entrySet()) {
            sb.append("  Difficulty ").append(e.getKey()).append(": ")
              .append(e.getValue()[1]).append("/").append(e.getValue()[0]).append(" completed\n");
        }

        sb.append("\nSessions by hour of day:\n");
        for (var e : todStats.entrySet()) {
            sb.append("  ").append(e.getKey()).append(":00 → ").append(e.getValue()).append(" sessions\n");
        }

        sb.append("\nRespond ONLY with a valid JSON object. No explanations. Schema:\n");
        sb.append("""
        {
          "strengths": ["string - e.g., 'Strong morning consistency'"],
          "bottlenecks": ["string - e.g., 'Drops focus after 3 topics per day'"],
          "optimalStrategy": "string - e.g., 'Schedule deep work before 11 AM'",
          "predictedBurnoutRisk": "low" | "medium" | "high"
        }
        """);
        return sb.toString();
    }

    private String callGroq(String prompt) {
        String key = defaultGroqApiKey;
        if (key == null || key.isBlank()) throw new RuntimeException("Groq API key not configured");

        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", MODEL);
        body.put("temperature", 0.3);
        body.put("max_tokens", 1024);
        ArrayNode messages = body.putArray("messages");
        ObjectNode sys = messages.addObject();
        sys.put("role", "system");
        sys.put("content", "You are an expert learning psychologist. Analyze study data and identify cognitive bottlenecks, peak performance windows, and retention risks.");
        ObjectNode user = messages.addObject();
        user.put("role", "user");
        user.put("content", prompt);

        var response = restClient.post()
                .uri(GROQ_URL)
                .header("Authorization", "Bearer " + key)
                .header("Content-Type", "application/json")
                .body(body)
                .retrieve()
                .body(JsonNode.class);

        if (response != null && response.has("choices") && response.get("choices").isArray() && response.get("choices").size() > 0) {
            return response.get("choices").get(0).get("message").get("content").asText();
        }
        throw new RuntimeException("Groq API returned unexpected response");
    }

    private CognitiveAnalysisResponse parseResponse(String raw, double avgMin, long totalSessions,
                                                     long totalMins, int longestStreak, int currentStreak) {
        String cleaned = raw.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
        try {
            JsonNode root = objectMapper.readTree(cleaned);
            List<String> strengths = new ArrayList<>();
            List<String> bottlenecks = new ArrayList<>();
            if (root.has("strengths") && root.get("strengths").isArray()) {
                root.get("strengths").forEach(n -> strengths.add(n.asText()));
            }
            if (root.has("bottlenecks") && root.get("bottlenecks").isArray()) {
                root.get("bottlenecks").forEach(n -> bottlenecks.add(n.asText()));
            }
            String strategy = root.has("optimalStrategy") ? root.get("optimalStrategy").asText() : "Maintain consistency.";
            String risk = root.has("predictedBurnoutRisk") ? root.get("predictedBurnoutRisk").asText() : "low";
            if (!Set.of("low", "medium", "high").contains(risk)) risk = "low";

            return new CognitiveAnalysisResponse(strengths, bottlenecks, strategy, risk,
                    new CognitiveAnalysisResponse.StudyStats(avgMin, totalSessions, totalMins, longestStreak, currentStreak));
        } catch (Exception e) {
            log.error("Failed to parse Groq response", e);
            return fallbackAnalysis(avgMin, totalSessions, totalMins, longestStreak, currentStreak);
        }
    }

    private CognitiveAnalysisResponse fallbackAnalysis(double avgMin, long totalSessions,
                                                        long totalMins, int longestStreak, int currentStreak) {
        List<String> strengths = new ArrayList<>();
        List<String> bottlenecks = new ArrayList<>();
        if (totalSessions > 10) strengths.add("Consistent study habit with " + totalSessions + " sessions in 30 days");
        else bottlenecks.add("Low session count — aim for at least 15 sessions per month");
        if (longestStreak >= 5) strengths.add("Strong streak of " + longestStreak + " consecutive days");
        else bottlenecks.add("Short streaks — try to study on consecutive days");
        if (avgMin >= 30) strengths.add(String.format("Good session depth (avg %.0f min)", avgMin));
        else bottlenecks.add("Sessions are too short — extend to at least 30 min each");

        return new CognitiveAnalysisResponse(
                strengths.isEmpty() ? List.of("Getting started is the first step!") : strengths,
                bottlenecks.isEmpty() ? List.of("Keep monitoring your patterns") : bottlenecks,
                "Aim for 4-5 focused sessions per week with consistent timing.",
                totalSessions > 30 ? "medium" : "low",
                new CognitiveAnalysisResponse.StudyStats(avgMin, totalSessions, totalMins, longestStreak, currentStreak)
        );
    }
}
