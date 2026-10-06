package com.jumpstart.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    @Value("${jumpstart.oauth2.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
        OAuth2User oAuth2User = token.getPrincipal();

        String accessToken = oAuth2User.getAttribute("accessToken");
        String refreshToken = oAuth2User.getAttribute("refreshToken");
        Long expiresInMs = oAuth2User.getAttribute("expiresInMs");

        String targetBaseUrl = resolveFrontendUrl(request);
        String redirectUrl = targetBaseUrl + "/auth/callback"
                + "?accessToken=" + accessToken
                + "&refreshToken=" + refreshToken
                + "&expiresInMs=" + expiresInMs;

        log.info("OAuth2 login successful for: {}, redirecting to: {}", (String) oAuth2User.getAttribute("email"), targetBaseUrl);
        response.sendRedirect(redirectUrl);
    }

    private String resolveFrontendUrl(HttpServletRequest request) {
        if (frontendUrl == null || frontendUrl.isBlank()) {
            return "http://localhost:5173";
        }
        String[] urls = frontendUrl.split(",");
        String referer = request.getHeader("Referer");
        String origin = request.getHeader("Origin");

        for (String url : urls) {
            String trimmed = url.trim();
            if (trimmed.isEmpty()) continue;
            if (origin != null && origin.startsWith(trimmed)) {
                return trimmed.replaceAll("/+$", "");
            }
            if (referer != null && referer.startsWith(trimmed)) {
                return trimmed.replaceAll("/+$", "");
            }
        }
        return urls[0].trim().replaceAll("/+$", "");
    }
}