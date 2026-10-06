package com.jumpstart.schedule.ai;

import com.jumpstart.roadmap.Roadmap;
import com.jumpstart.roadmap.RoadmapRepository;
import com.jumpstart.schedule.ai.dto.MonthlyPlanResponse;
import com.jumpstart.topic.Topic;
import com.jumpstart.topic.TopicRepository;
import com.jumpstart.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MonthlyPlannerService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final MonthlyPlanRepository monthlyPlanRepository;
    private final UserRepository userRepository;
    private final RoadmapRepository roadmapRepository;
    private final TopicRepository topicRepository;

    @Value("${jumpstart.ai.groq-api-key:}")
    private String defaultGroqApiKey;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL = "llama-3.3-70b-versatile";

    public SseEmitter streamMonthlyPlan(Long userId, String monthKey, List<Long> roadmapIds, String groqApiKey, Integer dailyMinutes) {
        String apiKey = (groqApiKey != null && !groqApiKey.isBlank()) ? groqApiKey : defaultGroqApiKey;
        YearMonth ym = YearMonth.parse(monthKey);
        LocalDate firstDay = ym.atDay(1);
        int dailyBudget = (dailyMinutes != null && dailyMinutes > 0) ? dailyMinutes : 120;

        List<TopicSeed> topics = new ArrayList<>();
        for (Long rid : roadmapIds) {
            Roadmap r = roadmapRepository.findById(rid).orElse(null);
            if (r == null) continue;
            List<Topic> roadmapTopics = topicRepository.findByRoadmapIdOrderBySortOrderAsc(rid);
            for (Topic t : roadmapTopics) {
                topics.add(new TopicSeed(t.getId(), t.getTitle(), r.getId(), r.getTitle(),
                        r.getColorTheme() != null ? r.getColorTheme().name() : "MOSS",
                        t.getDifficulty(), (int) Math.ceil(t.getEstHours())));
            }
        }

        SseEmitter emitter = new SseEmitter(120_000L);

        if (topics.isEmpty()) {
            try { emitter.send(SseEmitter.event().name("month-complete").data("[]")); } catch (Exception ignored) {}
            emitter.complete();
            return emitter;
        }

        String prompt = buildMonthPrompt(topics, monthKey, ym.lengthOfMonth(), dailyBudget);
        String jsonBody = buildGroqRequestBody(prompt, true);

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GROQ_URL))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .header("Accept", "text/event-stream")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8))
                .build();

        client.sendAsync(request, HttpResponse.BodyHandlers.ofLines())
                .thenAccept(response -> {
                    try {
                        StringBuilder accumulated = new StringBuilder();
                        int[] prevDayCount = {0};
                        response.body().forEach(line -> {
                            if (line.startsWith("data: ")) {
                                String data = line.substring(6);
                                if ("[DONE]".equals(data)) return;
                                try {
                                    JsonNode chunk = objectMapper.readTree(data);
                                    JsonNode choices = chunk.get("choices");
                                    if (choices != null && choices.isArray() && choices.size() > 0) {
                                        JsonNode delta = choices.get(0).get("delta");
                                        if (delta != null && delta.has("content")) {
                                            accumulated.append(delta.get("content").asText());
                                            String current = accumulated.toString();
                                            if (current.contains("\"days\"") && current.trim().endsWith("}")) {
                                                try {
                                                    int start = current.indexOf("{");
                                                    int end = current.lastIndexOf("}");
                                                    if (start >= 0 && end > start) {
                                                        String clean = current.substring(start, end + 1);
                                                        JsonNode root = objectMapper.readTree(clean);
                                                        JsonNode days = root.get("days");
                                                        if (days != null && days.isArray() && days.size() > prevDayCount[0]) {
                                                            prevDayCount[0] = days.size();
                                                            List<MonthlyPlanChunk> partial = new ArrayList<>();
                                                            for (JsonNode day : days) {
                                                                int dayNum = day.get("date").asInt();
                                                                JsonNode tasks = day.get("tasks");
                                                                if (tasks != null && tasks.isArray()) {
                                                                    for (JsonNode task : tasks) {
                                                                        String title = task.get("title").asText();
                                                                        int estMin = task.has("estimatedMinutes") ? task.get("estimatedMinutes").asInt(30) : 30;
                                                                        String diff = task.has("difficulty") ? task.get("difficulty").asText("BEGINNER") : "BEGINNER";
                                                                        partial.add(new MonthlyPlanChunk(dayNum, title, estMin, diff));
                                                                    }
                                                                }
                                                            }
                                                            emitter.send(SseEmitter.event()
                                                                    .name("month-chunk")
                                                                    .data(objectMapper.writeValueAsString(partial)));
                                                        }
                                                    }
                                                } catch (Exception e) { /* partial parse — skip */ }
                                            }
                                        }
                                    }
                                } catch (Exception e) { /* skip malformed chunk */ }
                            }
                        });

                        // Final complete parse & persist
                        try {
                            String full = accumulated.toString();
                            int start = full.indexOf("{");
                            int end = full.lastIndexOf("}");
                            if (start >= 0 && end > start) {
                                String clean = full.substring(start, end + 1);
                                List<MonthlyPlan> plans = parseMonthResponse(clean, userId, monthKey, firstDay, topics);
                                monthlyPlanRepository.deleteByUserIdAndMonthKey(userId, monthKey);
                                for (MonthlyPlan p : plans) monthlyPlanRepository.save(p);
                                var responses = plans.stream().map(MonthlyPlanResponse::from).collect(Collectors.toList());
                                emitter.send(SseEmitter.event().name("month-complete")
                                        .data(objectMapper.writeValueAsString(responses)));
                            }
                        } catch (Exception e) {
                            log.error("Final monthly parse failed", e);
                            // Fallback: attempt sync generation
                            try {
                                List<MonthlyPlan> fallback = generateMonthlyPlan(userId, monthKey, roadmapIds, apiKey, dailyBudget);
                                var responses = fallback.stream().map(MonthlyPlanResponse::from).collect(Collectors.toList());
                                emitter.send(SseEmitter.event().name("month-complete")
                                        .data(objectMapper.writeValueAsString(responses)));
                            } catch (Exception ex) {
                                emitter.completeWithError(ex);
                            }
                        }
                        emitter.complete();
                    } catch (Exception e) {
                        emitter.completeWithError(e);
                    }
                })
                .exceptionally(ex -> {
                    // Fallback to sync on error
                    try {
                        List<MonthlyPlan> fallback = generateMonthlyPlan(userId, monthKey, roadmapIds, apiKey, dailyBudget);
                        var responses = fallback.stream().map(MonthlyPlanResponse::from).collect(Collectors.toList());
                        emitter.send(SseEmitter.event().name("month-complete")
                                .data(objectMapper.writeValueAsString(responses)));
                        emitter.complete();
                    } catch (Exception e) {
                        emitter.completeWithError(e);
                    }
                    return null;
                });

        return emitter;
    }

    private String buildGroqRequestBody(String prompt, boolean stream) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", MODEL);
        body.put("temperature", 0.3);
        body.put("max_tokens", 4096);
        body.put("stream", stream);
        ArrayNode messages = body.putArray("messages");
        ObjectNode msg = messages.addObject();
        msg.put("role", "user");
        msg.put("content", prompt);
        return body.toString();
    }

    @Transactional
    public List<MonthlyPlan> generateMonthlyPlan(Long userId, String monthKey, List<Long> roadmapIds, String groqApiKey, Integer dailyMinutes) {
        String apiKey = (groqApiKey != null && !groqApiKey.isBlank()) ? groqApiKey : defaultGroqApiKey;
        YearMonth ym = YearMonth.parse(monthKey);
        int daysInMonth = ym.lengthOfMonth();
        LocalDate firstDay = ym.atDay(1);
        int dailyBudget = (dailyMinutes != null && dailyMinutes > 0) ? dailyMinutes : 120;

        // Collect topics from selected roadmaps
        List<TopicSeed> topics = new ArrayList<>();
        for (Long rid : roadmapIds) {
            Roadmap r = roadmapRepository.findById(rid).orElse(null);
            if (r == null) continue;
            List<Topic> roadmapTopics = topicRepository.findByRoadmapIdOrderBySortOrderAsc(rid);
            for (Topic t : roadmapTopics) {
                topics.add(new TopicSeed(
                        t.getId(), t.getTitle(), r.getId(), r.getTitle(),
                        r.getColorTheme() != null ? r.getColorTheme().name() : "MOSS",
                        t.getDifficulty(), (int) Math.ceil(t.getEstHours())
                ));
            }
        }

        if (topics.isEmpty()) return List.of();

        // Delete existing plan for this month
        monthlyPlanRepository.deleteByUserIdAndMonthKey(userId, monthKey);

        List<MonthlyPlan> plan;
        try {
            String prompt = buildMonthPrompt(topics, monthKey, daysInMonth, dailyBudget);
            String aiResponse = callGroq(prompt, apiKey);
            plan = parseMonthResponse(aiResponse, userId, monthKey, firstDay, topics);
        } catch (Exception e) {
            log.error("Groq monthly planning failed, using fallback", e);
            plan = fallbackMonthPlan(userId, monthKey, firstDay, topics, daysInMonth, dailyBudget);
        }

        // Persist
        for (MonthlyPlan p : plan) {
            monthlyPlanRepository.save(p);
        }
        return plan;
    }

    private String buildMonthPrompt(List<TopicSeed> topics, String monthKey, int daysInMonth, int dailyBudget) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are a monthly learning scheduler. Distribute the following topics across ")
          .append(daysInMonth).append(" days in ").append(monthKey)
          .append(". Each day has ~").append(dailyBudget).append(" minutes available.\n\n");
        sb.append("Rules:\n");
        sb.append("1. Order topics from foundational/basic to advanced WITHIN each roadmap\n");
        sb.append("2. MIX topics from different roadmaps on the same day (multi-roadmap days)\n");
        sb.append("3. Distribute evenly — don't overload a single day\n");
        sb.append("4. Each topic should appear exactly once\n");
        sb.append("5. Assign realistic time estimates (15-180 min) per topic\n\n");
        sb.append("Topics:\n");
        for (TopicSeed t : topics) {
            sb.append("- ").append(t.title).append(" [Roadmap: ").append(t.roadmapTitle)
              .append("] [Diff: ").append(t.difficulty).append("] [Est: ").append(t.estHours).append("h]\n");
        }
        sb.append("\nRespond ONLY with a valid JSON object: {\"days\": [{ \"date\": 1..").append(daysInMonth)
          .append(", \"tasks\": [{\"title\": string, \"estimatedMinutes\": int, \"difficulty\": \"BEGINNER\"|\"INTERMEDIATE\"|\"ADVANCED\"}] }]}. No explanations.");
        return sb.toString();
    }

    private String callGroq(String prompt, String apiKey) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", MODEL);
        body.put("temperature", 0.3);
        body.put("max_tokens", 4096);
        ArrayNode messages = body.putArray("messages");
        ObjectNode msg = messages.addObject();
        msg.put("role", "user");
        msg.put("content", prompt);
        var response = restClient.post()
                .uri(GROQ_URL).header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json").body(body)
                .retrieve().body(JsonNode.class);
        if (response != null && response.has("choices") && response.get("choices").isArray() && response.get("choices").size() > 0) {
            return response.get("choices").get(0).get("message").get("content").asText();
        }
        throw new RuntimeException("Groq API returned unexpected response");
    }

    private List<MonthlyPlan> parseMonthResponse(String response, Long userId, String monthKey, LocalDate firstDay, List<TopicSeed> topics) throws Exception {
        String cleaned = response.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
        JsonNode root = objectMapper.readTree(cleaned);
        JsonNode days = root.get("days");
        List<MonthlyPlan> plans = new ArrayList<>();
        int globalOrder = 0;
        if (days != null && days.isArray()) {
            Map<String, TopicSeed> topicMap = new HashMap<>();
            for (TopicSeed t : topics) topicMap.put(t.title.toLowerCase().trim(), t);

            for (JsonNode day : days) {
                int dayNum = day.get("date").asInt();
                LocalDate date = firstDay.withDayOfMonth(Math.min(dayNum, firstDay.lengthOfMonth()));
                JsonNode tasks = day.get("tasks");
                if (tasks != null && tasks.isArray()) {
                    for (JsonNode task : tasks) {
                        String title = task.get("title").asText();
                        int estMin = task.has("estimatedMinutes") ? task.get("estimatedMinutes").asInt(30) : 30;
                        String diff = task.has("difficulty") ? task.get("difficulty").asText("BEGINNER") : "BEGINNER";
                        TopicSeed matched = topicMap.get(title.toLowerCase().trim());
                        if (matched == null) {
                            matched = topicMap.values().stream()
                                    .filter(t -> title.toLowerCase().contains(t.title.toLowerCase()) || t.title.toLowerCase().contains(title.toLowerCase()))
                                    .findFirst().orElse(null);
                        }
                        plans.add(MonthlyPlan.builder()
                                .user(userRepository.getReferenceById(userId))
                                .monthKey(monthKey).date(date)
                                .taskTitle(title)
                                .topicId(matched != null ? matched.topicId : null)
                                .topicTitle(matched != null ? matched.title : title)
                                .roadmapId(matched != null ? matched.roadmapId : null)
                                .roadmapTitle(matched != null ? matched.roadmapTitle : null)
                                .roadmapColor(matched != null ? matched.color : "MOSS")
                                .estimatedMinutes(estMin)
                                .sortOrder(globalOrder++).status("PENDING")
                                .difficulty(diff).build());
                    }
                }
            }
        }
        return plans;
    }

    private List<MonthlyPlan> fallbackMonthPlan(Long userId, String monthKey, LocalDate firstDay, List<TopicSeed> topics, int daysInMonth, int dailyBudget) {
        List<MonthlyPlan> plans = new ArrayList<>();
        int order = 0;
        // Sort topics by difficulty (basic first)
        Map<String, Integer> diffOrder = Map.of("BEGINNER", 0, "1", 1, "2", 2, "INTERMEDIATE", 3, "3", 4, "ADVANCED", 5);
        List<TopicSeed> sorted = topics.stream()
                .sorted(Comparator.comparing(t -> diffOrder.getOrDefault(t.difficulty, 0)))
                .collect(Collectors.toList());
        int dayIdx = 0;
        for (TopicSeed t : sorted) {
            LocalDate date = firstDay.plusDays(dayIdx % daysInMonth);
            int min = Math.max(15, Math.min(t.estHours * 60 / (Math.max(1, t.estHours)), 120));
            plans.add(MonthlyPlan.builder()
                    .user(userRepository.getReferenceById(userId))
                    .monthKey(monthKey).date(date)
                    .taskTitle(t.title)
                    .topicId(t.topicId).topicTitle(t.title)
                    .roadmapId(t.roadmapId).roadmapTitle(t.roadmapTitle).roadmapColor(t.color)
                    .estimatedMinutes(min).sortOrder(order++)
                    .status("PENDING").difficulty(mapDifficulty(t.difficulty)).build());
            dayIdx++;
        }
        return plans;
    }

    private String mapDifficulty(int diff) {
        if (diff <= 1) return "BEGINNER";
        if (diff <= 3) return "INTERMEDIATE";
        return "ADVANCED";
    }

    private record TopicSeed(Long topicId, String title, Long roadmapId, String roadmapTitle, String color, int difficulty, int estHours) {}

    /** Lightweight chunk sent via SSE during streaming. */
    private record MonthlyPlanChunk(int day, String title, int estimatedMinutes, String difficulty) {}

    public List<MonthlyPlan> getMonthPlan(Long userId, String monthKey) {
        return monthlyPlanRepository.findByUserIdAndMonthKeyOrderByDateAscSortOrderAsc(userId, monthKey);
    }

    public List<MonthlyPlan> getDayPlan(Long userId, LocalDate date) {
        return monthlyPlanRepository.findByUserIdAndDateOrderBySortOrderAsc(userId, date);
    }

    public void updateStatus(Long planId, String status) {
        monthlyPlanRepository.findById(planId).ifPresent(p -> { p.setStatus(status); monthlyPlanRepository.save(p); });
    }
}
