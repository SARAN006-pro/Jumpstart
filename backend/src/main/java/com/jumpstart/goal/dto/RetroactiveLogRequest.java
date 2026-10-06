package com.jumpstart.goal.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;

public record RetroactiveLogRequest(
        @NotNull Long goalId,
        @NotNull @Positive double durationMinutes,
        LocalDate date,
        String notes
) {
    public LocalDate date() { return date != null ? date : LocalDate.now(); }
}
