package com.jumpstart.schedule.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.jumpstart.schedule.ai.dto.AiPlanRequest;
import com.jumpstart.schedule.ai.dto.AiPlanResponse;
import com.jumpstart.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroqAiPlannerService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final DailyPlanRepository dailyPlanRepository;
    private final UserRepository userRepository;

    @Value("${jumpstart.ai.groq-api-key:}")
    private String defaultGroqApiKey;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL = "llama-3.3-70b-versatile";

    public AiPlanResponse planDay(AiPlanRequest request, Long userId) {
        String apiKey = request.groqApiKey() != null && !request.groqApiKey().isBlank()
                ? request.groqApiKey() : defaultGroqApiKey;

        try {
            String prompt = buildPrompt(request);
            String aiResponse = callGroq(prompt, apiKey);
            AiPlanResponse parsed = parseResponse(aiResponse, request);
            persistPlan(parsed, userId, LocalDate.parse(request.date()));
            return parsed;
        } catch (Exception e) {
            log.error("Groq AI planning failed", e);
            return fallbackPlan(request);
        }
    }

    private String buildPrompt(AiPlanRequest request) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are a learning schedule optimizer. Given the following tasks for ").append(request.date()).append(", ");
        sb.append("reorder them from most foundational/basic to most advanced, and assign realistic time estimates in minutes.\n\n");
        sb.append("Tasks:\n");
        for (int i = 0; i < request.tasks().size(); i++) {
            var t = request.tasks().get(i);
            sb.append(i + 1).append(". ").append(t.title());
            if (t.topicTitle() != null) sb.append(" [Topic: ").append(t.topicTitle()).append("]");
            if (t.difficulty() != null) sb.append(" [Difficulty: ").append(t.difficulty()).append("]");
            if (t.estimatedMinutes() != null && t.estimatedMinutes() > 0) sb.append(" [Est: ").append(t.estimatedMinutes()).append("min]");
            sb.append("\n");
        }
        sb.append("\nRespond ONLY with a valid JSON array of objects. Each object must have: ");
        sb.append("{\"title\": string, \"estimatedMinutes\": number (10-240), \"difficulty\": \"BEGINNER\"|\"INTERMEDIATE\"|\"ADVANCED\"}. ");
        sb.append("Order from basic to advanced. No explanation, no markdown, just the JSON array.");
        return sb.toString();
    }

    private String callGroq(String prompt, String apiKey) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", MODEL);
        body.put("temperature", 0.3);
        body.put("max_tokens", 2048);

        ArrayNode messages = body.putArray("messages");
        ObjectNode msg = messages.addObject();
        msg.put("role", "user");
        msg.put("content", prompt);

        var response = restClient.post()
                .uri(GROQ_URL)
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .body(body)
                .retrieve()
                .body(JsonNode.class);

        if (response != null && response.has("choices") && response.get("choices").isArray()
                && response.get("choices").size() > 0) {
            return response.get("choices").get(0).get("message").get("content").asText();
        }
        throw new RuntimeException("Groq API returned unexpected response");
    }

    private AiPlanResponse parseResponse(String aiResponse, AiPlanRequest request) throws Exception {
        String cleaned = aiResponse.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
        JsonNode arr = objectMapper.readTree(cleaned);
        List<AiPlanResponse.PlannedTask> tasks = new ArrayList<>();
        int order = 0;
        for (JsonNode item : arr) {
            String title = item.has("title") ? item.get("title").asText() : "Task " + (order + 1);
            int estMin = item.has("estimatedMinutes") ? item.get("estimatedMinutes").asInt(30) : 30;
            String diff = item.has("difficulty") ? item.get("difficulty").asText("BEGINNER") : "BEGINNER";

            // Match back to original task for metadata
            var matched = request.tasks().stream()
                    .filter(t -> t.title().equalsIgnoreCase(title) || t.title().contains(title) || title.contains(t.title()))
                    .findFirst();

            tasks.add(new AiPlanResponse.PlannedTask(
                    title,
                    matched.map(AiPlanRequest.TaskSeed::topicTitle).orElse(null),
                    matched.map(AiPlanRequest.TaskSeed::topicId).orElse(null),
                    matched.map(AiPlanRequest.TaskSeed::goalId).orElse(null),
                    matched.map(AiPlanRequest.TaskSeed::goalTitle).orElse(null),
                    diff,
                    estMin,
                    order++
            ));
        }
        return new AiPlanResponse(request.date(), tasks);
    }

    private void persistPlan(AiPlanResponse plan, Long userId, LocalDate date) {
        dailyPlanRepository.deleteByUserIdAndDate(userId, date);
        for (var task : plan.tasks()) {
            DailyPlan entity = DailyPlan.builder()
                    .user(userRepository.getReferenceById(userId))
                    .date(date)
                    .taskTitle(task.title())
                    .topicId(task.topicId())
                    .topicTitle(task.topicTitle())
                    .goalId(task.goalId())
                    .goalTitle(task.goalTitle())
                    .estimatedMinutes(task.estimatedMinutes())
                    .sortOrder(task.sortOrder())
                    .status("PENDING")
                    .difficulty(task.difficulty())
                    .build();
            dailyPlanRepository.save(entity);
        }
    }

    private AiPlanResponse fallbackPlan(AiPlanRequest request) {
        List<AiPlanResponse.PlannedTask> tasks = new ArrayList<>();
        int order = 0;
        for (var t : request.tasks()) {
            tasks.add(new AiPlanResponse.PlannedTask(
                    t.title(), t.topicTitle(), t.topicId(), t.goalId(), t.goalTitle(),
                    t.difficulty() != null ? t.difficulty() : "BEGINNER",
                    t.estimatedMinutes() != null ? t.estimatedMinutes() : 30,
                    order++
            ));
        }
        return new AiPlanResponse(request.date(), tasks);
    }
}
