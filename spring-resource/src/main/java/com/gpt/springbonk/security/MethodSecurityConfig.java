package com.gpt.springbonk.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

/**
 * Enables @PreAuthorize / @PostAuthorize on service methods.
 *
 * <p>Spring-addons configures the resource-server filter chain; this config
 * only flips on method-level security so write paths can be gated by
 * {@link com.gpt.springbonk.constant.enumeration.security.Permission}.
 */
@Configuration
@EnableMethodSecurity
public class MethodSecurityConfig {
}
