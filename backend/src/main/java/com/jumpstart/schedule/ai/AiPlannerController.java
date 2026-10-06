package com.jumpstart.schedule.ai;

import com.jumpstart.schedule.ai.dto.*;
import com.jumpstart.schedule.session.ConfirmationStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/schedule/ai")
@RequiredArgsConstructor
public class AiPlannerController {

    private final PlanningContextService contextService;
    private final GroqEngineService groqEngine;
    private final AIScheduleCommitService commitService;

    @PostMapping("/context")
    public ResponseEntity<PlanningContext> getContext(
            @RequestBody ContextRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = Long.parseLong(userDetails.getUsername());
        PlanningContext ctx = contextService.getContext(userId, request.roadmapIds());
        return ResponseEntity.ok(ctx);
    }

    @PostMapping("/generate")
    public ResponseEntity<AIScheduleResponse> generate(
            @RequestBody AIGenerateRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = Long.parseLong(userDetails.getUsername());
        PlanningContext ctx = contextService.getContext(userId, request.roadmapIds());
        AIScheduleResponse plan = groqEngine.generateSchedule(ctx, request.groqApiKey());
        return ResponseEntity.ok(plan);
    }

    @PostMapping(value = "/generate/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter generateStream(
            @RequestBody AIGenerateRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = Long.parseLong(userDetails.getUsername());
        PlanningContext ctx = contextService.getContext(userId, request.roadmapIds());
        return groqEngine.streamSchedule(ctx, request.groqApiKey());
    }

    @PostMapping("/commit")
    public ResponseEntity<CommitResponse> commit(
            @RequestBody AICommitRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = Long.parseLong(userDetails.getUsername());
        int created = commitService.commitSchedule(userId, request);
        return ResponseEntity.ok(new CommitResponse(created, "Plan locked in! " + created + " sessions created (pending confirmation)."));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<PendingSessionResponse>> getPending(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = Long.parseLong(userDetails.getUsername());
        return ResponseEntity.ok(commitService.getPendingAiSessions(userId));
    }

    @PostMapping("/confirm")
    public ResponseEntity<CommitResponse> confirm(
            @RequestBody ConfirmRequest body,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = Long.parseLong(userDetails.getUsername());
        ConfirmationStatus status;
        try { status = ConfirmationStatus.valueOf(body.status().toUpperCase()); }
        catch (Exception e) { return ResponseEntity.badRequest().build(); }
        int updated = commitService.confirmSessions(userId, body.sessionIds(), status);
        return ResponseEntity.ok(new CommitResponse(updated, "Confirmed " + updated + " AI sessions."));
    }

    public record ContextRequest(List<Long> roadmapIds) {}
    public record CommitResponse(int sessionsCreated, String message) {}
    public record ConfirmRequest(List<Long> sessionIds, String status) {}
}
