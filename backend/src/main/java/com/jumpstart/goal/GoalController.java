package com.jumpstart.goal;

import com.jumpstart.common.dto.PageResponse;
import com.jumpstart.goal.checkin.GoalCheckIn;
import com.jumpstart.goal.checkin.GoalCheckInResponse;
import com.jumpstart.goal.checkin.GoalCheckInService;
import com.jumpstart.goal.dto.GoalProjectionResponse;
import com.jumpstart.goal.dto.GoalRequest;
import com.jumpstart.goal.dto.GoalResponse;
import com.jumpstart.goal.dto.RetroactiveLogRequest;
import com.jumpstart.goal.milestone.MilestoneResponse;
import com.jumpstart.goal.milestone.MilestoneRepository;
import com.jumpstart.goal.streak.StreakFreeze;
import com.jumpstart.goal.streak.StreakFreezeRepository;
import com.jumpstart.schedule.dto.ScheduleItemResponse;
import com.jumpstart.security.SecurityUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/goals")
@RequiredArgsConstructor
@Tag(name = "Goals", description = "Daily, weekly, monthly and long-term targets")
public class GoalController {

    private final GoalService goalService;
    private final GoalCheckInService checkInService;
    private final GoalEngineService goalEngineService;
    private final MilestoneRepository milestoneRepository;
    private final StreakFreezeRepository freezeRepository;
    private final GoalProjectionService projectionService;

    @PostMapping
    public ResponseEntity<GoalResponse> create(@Valid @RequestBody GoalRequest request, @AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(goalService.create(request, principal.getId()));
    }

    @GetMapping
    public ResponseEntity<PageResponse<GoalResponse>> list(
            @RequestParam(required = false) Cadence cadence,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long topicId,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(goalService.list(principal.getId(), cadence, status, topicId, pageable));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<GoalResponse> update(
            @PathVariable Long id, @Valid @RequestBody GoalRequest request, @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(goalService.update(id, request, principal.getId(), principal.getUser().getRole()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        goalService.delete(id, principal.getId(), principal.getUser().getRole());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/today-schedule")
    public ResponseEntity<List<ScheduleItemResponse>> todaySchedule(@AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(goalService.getTodaySchedule(principal.getId()));
    }

    @PostMapping("/from-schedule/{topicId}")
    public ResponseEntity<GoalResponse> createFromSchedule(
            @PathVariable Long topicId,
            @RequestParam String title,
            @RequestParam int minutes,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(goalService.createDailyFromSchedule(principal.getId(), topicId, title, minutes));
    }

    // ── Projections (Time-to-Goal) ──

    @GetMapping("/projections")
    public ResponseEntity<List<GoalProjectionResponse>> getProjections(@AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(projectionService.getProjections(principal.getId()));
    }

    // ── Check-in ──

    @GetMapping("/{id}/checkins")
    public ResponseEntity<List<GoalCheckInResponse>> getCheckIns(@PathVariable Long id) {
        List<GoalCheckIn> items = checkInService.getCheckIns(id);
        var responses = items.stream().map(c -> new GoalCheckInResponse(
            c.getId(), c.getGoal().getId(), c.getDate(), c.getValue(), c.getNotes(), c.getCreatedAt()
        )).toList();
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/{id}/checkin")
    public ResponseEntity<GoalCheckInResponse> submitCheckIn(
            @PathVariable Long id,
            @RequestParam double value,
            @RequestParam(required = false) String notes,
            @RequestParam(required = false) String date,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        LocalDate d = date != null ? LocalDate.parse(date) : LocalDate.now();
        GoalCheckIn checkIn = checkInService.submitCheckIn(id, principal.getId(), value, notes, d);
        return ResponseEntity.ok(new GoalCheckInResponse(
            checkIn.getId(), checkIn.getGoal().getId(), checkIn.getDate(),
            checkIn.getValue(), checkIn.getNotes(), checkIn.getCreatedAt()
        ));
    }

    @PostMapping("/retroactive")
    public ResponseEntity<GoalCheckInResponse> retroactiveLog(
            @Valid @RequestBody RetroactiveLogRequest request,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        GoalCheckIn checkIn = checkInService.retroactiveLog(
                request.goalId(), principal.getId(),
                request.durationMinutes(), request.date(), request.notes()
        );
        return ResponseEntity.ok(new GoalCheckInResponse(
            checkIn.getId(), checkIn.getGoal().getId(), checkIn.getDate(),
            checkIn.getValue(), checkIn.getNotes(), checkIn.getCreatedAt()
        ));
    }

    // ── Milestones ──

    @GetMapping("/{id}/milestones")
    public ResponseEntity<List<MilestoneResponse>> getMilestones(@PathVariable Long id) {
        var items = milestoneRepository.findByGoalIdOrderByTargetPercentageAsc(id);
        return ResponseEntity.ok(items.stream().map(MilestoneResponse::from).toList());
    }

    // ── Streak Freezes ──

    @GetMapping("/streak-freezes")
    public ResponseEntity<Long> availableFreezes(@AuthenticationPrincipal SecurityUser principal) {
        return ResponseEntity.ok(freezeRepository.countByUserIdAndIsUsedFalse(principal.getId()));
    }

    @PostMapping("/streak-freezes")
    public ResponseEntity<Void> addFreeze(@AuthenticationPrincipal SecurityUser principal) {
        StreakFreeze freeze = StreakFreeze.builder()
            .user(principal.getUser())
            .usedDate(LocalDate.now())
            .isUsed(false)
            .build();
        freezeRepository.save(freeze);
        return ResponseEntity.ok().build();
    }

    // ── Engine trigger (for testing / manual sync) ──

    @PostMapping("/engine/process-session")
    public ResponseEntity<Void> processSession(
            @RequestParam Long sessionId,
            @AuthenticationPrincipal SecurityUser principal
    ) {
        var session = goalService.loadSession(sessionId);
        goalEngineService.processSessionCompleted(principal.getId(), session);
        return ResponseEntity.ok().build();
    }
}
