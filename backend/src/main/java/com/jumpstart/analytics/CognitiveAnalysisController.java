package com.jumpstart.analytics;

import com.jumpstart.analytics.dto.CognitiveAnalysisResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class CognitiveAnalysisController {

    private final CognitiveAnalysisService analysisService;

    @PostMapping("/cognitive")
    public ResponseEntity<CognitiveAnalysisResponse> analyze(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = Long.parseLong(userDetails.getUsername());
        CognitiveAnalysisResponse result = analysisService.analyze(userId);
        return ResponseEntity.ok(result);
    }
}
