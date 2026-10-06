package com.jumpstart.auth;

import com.jumpstart.auth.dto.AuthResponse;
import com.jumpstart.auth.dto.UserResponse;
import com.jumpstart.security.JwtService;
import com.jumpstart.security.TokenHasher;
import com.jumpstart.user.Role;
import com.jumpstart.user.User;
import com.jumpstart.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Value("${jumpstart.security.jwt.refresh-expiration-ms:604800000}")
    private long refreshExpirationMs;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        String email = extractEmail(oAuth2User);
        String name = extractName(oAuth2User, email);

        User user = userRepository.findByEmail(email)
                .orElseGet(() -> createOAuthUser(email, name));

        if (!user.getName().equals(name)) {
            user.setName(name);
            userRepository.save(user);
        }

        AuthResponse tokens = issueTokens(user);

        Map<String, Object> attributes = new java.util.LinkedHashMap<>(oAuth2User.getAttributes());
        attributes.put("accessToken", tokens.accessToken());
        attributes.put("refreshToken", tokens.refreshToken());
        attributes.put("expiresInMs", tokens.expiresInMs());

        return new DefaultOAuth2User(
                oAuth2User.getAuthorities(),
                attributes,
                "email"
        );
    }

    private User createOAuthUser(String email, String name) {
        User user = User.builder()
                .name(name)
                .email(email.toLowerCase())
                .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                .role(Role.STUDENT)
                .emailVerified(true)
                .build();
        return userRepository.save(user);
    }

    private String extractEmail(OAuth2User oAuth2User) {
        String email = oAuth2User.getAttribute("email");
        if (email == null) throw new OAuth2AuthenticationException("Email not provided by Google");
        return email.toLowerCase();
    }

    private String extractName(OAuth2User oAuth2User, String email) {
        String name = oAuth2User.getAttribute("name");
        if (name == null) name = oAuth2User.getAttribute("given_name");
        if (name == null) name = email.split("@")[0];
        return name;
    }

    private AuthResponse issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String rawRefreshToken = TokenHasher.generateRawToken();

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(TokenHasher.hash(rawRefreshToken))
                .expiresAt(Instant.now().plusMillis(refreshExpirationMs))
                .revoked(false)
                .createdAt(Instant.now())
                .build();
        refreshTokenRepository.save(refreshToken);

        return new AuthResponse(accessToken, rawRefreshToken, jwtService.getAccessExpirationMs(), UserResponse.from(user));
    }
}