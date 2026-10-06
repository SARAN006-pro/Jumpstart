package com.jumpstart.schedule.ai;

import com.jumpstart.schedule.ai.dto.MonthlyPlanRequest;
import com.jumpstart.schedule.ai.dto.MonthlyPlanResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/schedule/monthly-plan")
@RequiredArgsConstructor
public class MonthlyPlanController {

    private final MonthlyPlannerService plannerService;

    @PostMapping("/generate")
    public ResponseEntity<List<MonthlyPlanResponse>> generate(
            @RequestBody MonthlyPlanRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = Long.parseLong(userDetails.getUsername());
        List<MonthlyPlan> plans = plannerService.generateMonthlyPlan(
                userId, request.monthKey(), request.roadmapIds(), request.groqApiKey(), request.dailyMinutes()
        );
        return ResponseEntity.ok(plans.stream().map(MonthlyPlanResponse::from).collect(Collectors.toList()));
    }

    @PostMapping(value = "/generate/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter generateStream(
            @RequestBody MonthlyPlanRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = Long.parseLong(userDetails.getUsername());
        return plannerService.streamMonthlyPlan(
                userId, request.monthKey(), request.roadmapIds(), request.groqApiKey(), request.dailyMinutes()
        );
    }

    @GetMapping("/{monthKey}")
    public ResponseEntity<List<MonthlyPlanResponse>> getMonth(
            @PathVariable String monthKey,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = Long.parseLong(userDetails.getUsername());
        List<MonthlyPlan> plans = plannerService.getMonthPlan(userId, monthKey);
        return ResponseEntity.ok(plans.stream().map(MonthlyPlanResponse::from).collect(Collectors.toList()));
    }

    @GetMapping("/day/{date}")
    public ResponseEntity<List<MonthlyPlanResponse>> getDay(
            @PathVariable String date,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = Long.parseLong(userDetails.getUsername());
        List<MonthlyPlan> plans = plannerService.getDayPlan(userId, LocalDate.parse(date));
        return ResponseEntity.ok(plans.stream().map(MonthlyPlanResponse::from).collect(Collectors.toList()));
    }

    @PatchMapping("/{planId}/status")
    public ResponseEntity<Void> updateStatus(
            @PathVariable Long planId, @RequestBody StatusUpdate body
    ) {
        plannerService.updateStatus(planId, body.status());
        return ResponseEntity.ok().build();
    }

    public record StatusUpdate(String status) {}
}
