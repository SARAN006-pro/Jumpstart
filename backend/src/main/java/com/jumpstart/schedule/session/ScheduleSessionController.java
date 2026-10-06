package com.jumpstart.schedule.session;

import com.jumpstart.security.SecurityUser;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/schedule/sessions")
@RequiredArgsConstructor
@Tag(name = "Schedule Sessions", description = "Advanced calendar sessions with timezone & RRULE")
public class ScheduleSessionController {

    private final ScheduleSessionService service;

    @GetMapping
    public ResponseEntity<List<SessionResponse>> getRange(
        @RequestParam Instant start,
        @RequestParam Instant end,
        @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(service.getRange(principal.getId(), start, end));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SessionResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<SessionResponse> create(
        @Valid @RequestBody SessionRequest request,
        @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(service.create(request, principal.getId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SessionResponse> update(
        @PathVariable Long id,
        @Valid @RequestBody SessionUpdateRequest request,
        @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(service.update(id, request, principal.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal SecurityUser principal) {
        service.delete(id, principal.getId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/timings")
    public ResponseEntity<SessionResponse> updateTimings(
        @PathVariable Long id,
        @RequestParam Instant newStart,
        @RequestParam Instant newEnd,
        @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(service.updateTimings(id, newStart, newEnd, principal.getId()));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<Void> markComplete(
        @PathVariable Long id,
        @RequestParam(required = false) Integer actualDuration
    ) {
        service.markComplete(id, actualDuration);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/skip")
    public ResponseEntity<Void> markSkipped(@PathVariable Long id) {
        service.markSkipped(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/daily")
    public ResponseEntity<List<SessionResponse>> getDaily(
        @RequestParam Instant dayStart,
        @RequestParam Instant dayEnd,
        @AuthenticationPrincipal SecurityUser principal
    ) {
        return ResponseEntity.ok(service.getDailySessions(principal.getId(), dayStart, dayEnd));
    }
}
