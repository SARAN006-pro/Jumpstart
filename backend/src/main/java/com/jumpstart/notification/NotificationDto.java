package com.jumpstart.notification;

import java.time.Instant;

public record NotificationDto(
    String type,
    String title,
    String message,
    Long relatedId,
    Instant timestamp
) {}
