package com.corp.iot.backend.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Optional;

@Service
public class JwtService {

    private final SecretKey key;
    private final Duration accessTokenTtl;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-ttl-minutes}") long accessTokenTtlMinutes
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.accessTokenTtl = Duration.ofMinutes(accessTokenTtlMinutes);
    }

    public String generateAccessToken(AppUserPrincipal principal) {
        Instant now = Instant.now();
        var builder = Jwts.builder()
                .subject(principal.userId().toString())
                .claim("username", principal.username())
                .claim("type", principal.type().name())
                .claim("authorities", principal.authorities())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTokenTtl)))
                .signWith(key);
        if (principal.tenantId() != null) {
            builder.claim("tenantId", principal.tenantId());
        }
        return builder.compact();
    }

    public long getAccessTokenTtlSeconds() {
        return accessTokenTtl.toSeconds();
    }

    public Optional<AppUserPrincipal> parse(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            Long tenantId = claims.get("tenantId", Number.class) != null
                    ? claims.get("tenantId", Number.class).longValue()
                    : null;
            @SuppressWarnings("unchecked")
            List<String> authorities = claims.get("authorities", List.class);
            return Optional.of(new AppUserPrincipal(
                    Long.valueOf(claims.getSubject()),
                    tenantId,
                    claims.get("username", String.class),
                    UserType.valueOf(claims.get("type", String.class)),
                    authorities
            ));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
