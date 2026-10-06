package com.jumpstart.schedule.ai;

import com.jumpstart.schedule.ai.dto.AiPlanRequest;
import com.jumpstart.schedule.ai.dto.AiPlanResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/schedule/ai-plan")
@RequiredArgsConstructor
public class AiPlanController {

    private final GroqAiPlannerService plannerService;
    private final DailyPlanRepository dailyPlanRepository;

    @PostMapping
    public ResponseEntity<AiPlanResponse> planDay(
            @RequestBody AiPlanRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = Long.parseLong(userDetails.getUsername());
        AiPlanResponse plan = plannerService.planDay(request, userId);
        return ResponseEntity.ok(plan);
    }

    @GetMapping("/{date}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<DailyPlan>> getDayPlan(
            @PathVariable String date,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = Long.parseLong(userDetails.getUsername());
        LocalDate localDate = LocalDate.parse(date);
        List<DailyPlan> plans = dailyPlanRepository.findByUserIdAndDateOrderBySortOrderAsc(userId, localDate);
        return ResponseEntity.ok(plans);
    }

    @PatchMapping("/{planId}/status")
    public ResponseEntity<Void> updateStatus(
            @PathVariable Long planId,
            @RequestBody StatusUpdate request
    ) {
        dailyPlanRepository.findById(planId).ifPresent(plan -> {
            plan.setStatus(request.status());
            dailyPlanRepository.save(plan);
        });
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{date}")
    public ResponseEntity<Void> deleteDayPlan(
            @PathVariable String date,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = Long.parseLong(userDetails.getUsername());
        dailyPlanRepository.deleteByUserIdAndDate(userId, LocalDate.parse(date));
        return ResponseEntity.ok().build();
    }

    public record StatusUpdate(String status) {}
}
