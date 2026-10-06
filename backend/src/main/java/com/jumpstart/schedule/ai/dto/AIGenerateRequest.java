package com.jumpstart.schedule.ai.dto;

import java.util.List;

public record AIGenerateRequest(
        List<Long> roadmapIds,
        String groqApiKey
) {}
