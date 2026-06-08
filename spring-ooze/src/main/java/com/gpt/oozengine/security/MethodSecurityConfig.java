package com.gpt.oozengine.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

/**
 * Enables @PreAuthorize / @PostAuthorize on service methods.
 *
 * <p>Spring-addons configures the resource-server filter chain (driven by the
 * {@code com.c4-soft.springaddons.oidc} properties); this config only flips on
 * method-level security so write paths can be gated once controllers land.
 */
@Configuration
@EnableMethodSecurity
public class MethodSecurityConfig {
}
