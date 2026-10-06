package com.jumpstart.schedule.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.jumpstart.schedule.ai.dto.AIScheduleResponse;
import com.jumpstart.schedule.ai.dto.PlanningContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroqEngineService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${jumpstart.ai.groq-api-key:}")
    private String defaultGroqApiKey;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL = "llama-3.3-70b-versatile";

    private static final String SYSTEM_PROMPT = """
You are an expert Cognitive Load Theorist and Learning Scheduler. Your job is to sequence topics from foundational to advanced based on prerequisites and difficulty.

RULES:
1. NEVER exceed the user's preferredStudyHoursPerDay.
2. Sequence basic topics before advanced ones based on prerequisiteTopicId. A topic with a prerequisite MUST come after its prerequisite.
3. Limit new_learning tasks to a max of 2 per day. Fill remaining time with deep_practice (coding/building) for that new topic.
4. SPACED REPETITION: For every new topic learned, insert a spaced_review task exactly 2 days later (approx 15 mins).
5. Adjust approxDurationMinutes based on difficulty (beginner: 30m, intermediate: 60m, advanced: 90m).
6. Distribute topics across the available days evenly.

Return a valid JSON object with this exact schema:
{
  "planOverview": "string - motivational summary",
  "dailyPlans": [
    {
      "dayLabel": "string - e.g., Monday, Day 1",
      "totalLoadMinutes": "number",
      "tasks": [
        {
          "topicId": "number",
          "taskType": "new_learning" | "deep_practice" | "spaced_review",
          "approxDurationMinutes": "number",
          "reasoning": "string - why this task is placed here"
        }
      ]
    }
  ]
}
""";

    public AIScheduleResponse generateSchedule(PlanningContext context, String apiKey) {
        String key = (apiKey != null && !apiKey.isBlank()) ? apiKey : defaultGroqApiKey;
        String prompt = buildUserPrompt(context);
        try {
            String response = callGroqSync(prompt, key);
            return parseResponse(response, context);
        } catch (Exception e) {
            log.error("Groq engine failed", e);
            return fallbackSchedule(context);
        }
    }

    public SseEmitter streamSchedule(PlanningContext context, String apiKey) {
        String key = (apiKey != null && !apiKey.isBlank()) ? apiKey : defaultGroqApiKey;
        SseEmitter emitter = new SseEmitter(120_000L);

        String prompt = buildUserPrompt(context);
        String jsonBody = buildGroqRequestBody(prompt, true);

        // Use async SSE from Groq streaming API
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GROQ_URL))
                .header("Authorization", "Bearer " + key)
                .header("Content-Type", "application/json")
                .header("Accept", "text/event-stream")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody, StandardCharsets.UTF_8))
                .build();

        client.sendAsync(request, HttpResponse.BodyHandlers.ofLines())
                .thenAccept(response -> {
                    try {
                        StringBuilder accumulated = new StringBuilder();
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
                                            String content = delta.get("content").asText();
                                            accumulated.append(content);
                                            // Try to send partial parse
                                            try {
                                                String current = accumulated.toString();
                                                // Only send when we detect complete JSON structure
                                                if (current.contains("\"dailyPlans\"")) {
                                                    AIScheduleResponse partial = objectMapper.readValue(current, AIScheduleResponse.class);
                                                    emitter.send(SseEmitter.event()
                                                            .name("plan-chunk")
                                                            .data(objectMapper.writeValueAsString(partial)));
                                                }
                                            } catch (Exception e) { /* partial parse failed — continue accumulating */ }
                                        }
                                    }
                                } catch (Exception e) { /* skip malformed chunk */ }
                            }
                        });
                        // Send final complete parse
                        try {
                            String full = accumulated.toString();
                            int start = full.indexOf("{");
                            int end = full.lastIndexOf("}");
                            if (start >= 0 && end > start) {
                                String clean = full.substring(start, end + 1);
                                AIScheduleResponse finalPlan = objectMapper.readValue(clean, AIScheduleResponse.class);
                                emitter.send(SseEmitter.event().name("plan-complete")
                                        .data(objectMapper.writeValueAsString(finalPlan)));
                            }
                        } catch (Exception e) { log.error("Final parse failed", e); }
                        emitter.complete();
                    } catch (Exception e) {
                        emitter.completeWithError(e);
                    }
                })
                .exceptionally(ex -> {
                    emitter.completeWithError(ex);
                    return null;
                });

        return emitter;
    }

    private String buildUserPrompt(PlanningContext ctx) {
        StringBuilder sb = new StringBuilder();
        sb.append("Generate a learning schedule with the following context:\n\n");
        sb.append("Roadmap: ").append(ctx.roadmapTitle()).append("\n");
        sb.append("Preferred study hours per day: ").append(ctx.userAvailability().preferredStudyHoursPerDay()).append("\n");
        sb.append("Available days: ").append(String.join(", ", ctx.userAvailability().availableDays())).append("\n");
        sb.append("Historical avg daily minutes: ").append(String.format("%.0f", ctx.learningPaceAvgMinutes())).append("\n\n");

        sb.append("Pending topics (ordered by sort order):\n");
        for (var t : ctx.pendingTopics()) {
            sb.append("- ").append(t.title())
              .append(" [id: ").append(t.id())
              .append(", difficulty: ").append(t.difficulty())
              .append(", estMinutes: ").append(t.estimatedMinutes());
            if (t.prerequisiteTopicId() != null) {
                sb.append(", prerequisiteTopicId: ").append(t.prerequisiteTopicId());
            }
            sb.append("]\n");
        }

        sb.append("\nStart date: ").append(LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)).append("\n");
        return sb.toString();
    }

    private String buildGroqRequestBody(String prompt, boolean stream) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", MODEL);
        body.put("temperature", 0.3);
        body.put("max_tokens", 8192);
        body.put("stream", stream);
        ArrayNode messages = body.putArray("messages");
        ObjectNode sys = messages.addObject();
        sys.put("role", "system");
        sys.put("content", SYSTEM_PROMPT);
        ObjectNode user = messages.addObject();
        user.put("role", "user");
        user.put("content", prompt);
        return body.toString();
    }

    private String callGroqSync(String prompt, String apiKey) {
        String body = buildGroqRequestBody(prompt, false);
        var response = restClient.post()
                .uri(GROQ_URL)
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .body(body)
                .retrieve()
                .body(JsonNode.class);
        if (response != null && response.has("choices") && response.get("choices").isArray() && response.get("choices").size() > 0) {
            return response.get("choices").get(0).get("message").get("content").asText();
        }
        throw new RuntimeException("Groq API returned unexpected response");
    }

    private AIScheduleResponse parseResponse(String raw, PlanningContext ctx) throws Exception {
        String cleaned = raw.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
        return objectMapper.readValue(cleaned, AIScheduleResponse.class);
    }

    private AIScheduleResponse fallbackSchedule(PlanningContext ctx) {
        List<AIScheduleResponse.DailyPlanBlock> days = new ArrayList<>();
        var topics = ctx.pendingTopics();
        int dayIdx = 0;
        int tasksPerDay = Math.min(3, Math.max(1, ctx.userAvailability().preferredStudyHoursPerDay() * 60 / 60));
        List<String> dayNames = ctx.userAvailability().availableDays();

        for (int i = 0; i < topics.size(); i += tasksPerDay) {
            String dayLabel = dayIdx < dayNames.size() ? dayNames.get(dayIdx) : "Day " + (dayIdx + 1);
            List<AIScheduleResponse.AITask> tasks = new ArrayList<>();
            int totalMin = 0;

            for (int j = i; j < Math.min(i + tasksPerDay, topics.size()); j++) {
                var t = topics.get(j);
                int min = switch (t.difficulty()) {
                    case 1 -> 30; case 2 -> 45; case 3 -> 60; case 4 -> 75; default -> 90;
                };
                tasks.add(new AIScheduleResponse.AITask(
                        t.id(), "new_learning", min,
                        "Foundational topic — " + t.title()
                ));
                totalMin += min;
            }

            days.add(new AIScheduleResponse.DailyPlanBlock(dayLabel, totalMin, tasks));
            dayIdx++;
        }

        return new AIScheduleResponse(
                "Structured plan across " + days.size() + " days covering " + topics.size() + " topics.",
                days
        );
    }
}
