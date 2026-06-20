package com.gpt.decks.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

/**
 * Enables @PreAuthorize / @PostAuthorize. Spring-addons configures the
 * resource-server filter chain from the {@code com.c4-soft.springaddons.oidc}
 * YAML; this only flips on method-level security. Lobby ownership (host-only
 * actions) is enforced in {@code LobbyService} against the JWT subject.
 */
@Configuration
@EnableMethodSecurity
public class MethodSecurityConfig {
}
