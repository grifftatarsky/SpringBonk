package com.gpt.jpss.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

/**
 * Enables {@code @PreAuthorize} / {@code @PostAuthorize} on service methods.
 *
 * <p>Spring-addons configures the resource-server filter chain (driven by the
 * {@code com.c4-soft.springaddons.oidc} properties); this only flips on
 * method-level security. Sticker ownership is enforced in
 * {@link com.gpt.jpss.sticker.StickerService} rather than by an expression,
 * because it is a row-level check rather than an authority check.
 */
@Configuration
@EnableMethodSecurity
public class MethodSecurityConfig {
}
