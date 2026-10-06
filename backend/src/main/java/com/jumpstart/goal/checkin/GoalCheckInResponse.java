package com.jumpstart.goal.checkin;

import java.time.LocalDate;
import java.time.Instant;

public record GoalCheckInResponse(
    Long id,
    Long goalId,
    LocalDate date,
    double value,
    String notes,
    Instant createdAt
) {}
