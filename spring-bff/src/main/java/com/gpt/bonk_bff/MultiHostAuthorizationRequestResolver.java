package com.gpt.bonk_bff;

import com.c4_soft.springaddons.security.oidc.starter.properties.SpringAddonsOidcProperties;
import com.c4_soft.springaddons.security.oidc.starter.reactive.client.SpringAddonsServerOAuth2AuthorizationRequestResolver;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.security.oauth2.client.autoconfigure.OAuth2ClientProperties;
import org.springframework.boot.webflux.autoconfigure.WebFluxProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.registration.ReactiveClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.server.ServerOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

/**
 * Lets one BFF serve more than one public domain.
 *
 * <p>spring-addons rewrites every authorization request's {@code redirect_uri} to
 * the single configured {@code client-uri}, ignoring the request entirely — so a
 * login started on a second domain is sent back to the first, and the session
 * cookie lands on the wrong host. Leaving {@code client-uri} unset is not an
 * escape: the reactive resolver has no "then leave it alone" branch (the servlet
 * one does), and falls back to a relative URI, which Keycloak rejects outright
 * with {@code Invalid parameter: redirect_uri}.
 *
 * <p>So this delegates to spring-addons — keeping PKCE, the extra authorization
 * parameters and the post-login URI handling it installs — and then swaps only
 * the scheme, host and port of the finished {@code redirect_uri} for the ones the
 * request actually arrived on. The path, including the {@code /bff} prefix, is
 * whatever spring-addons already worked out.
 *
 * <h2>Why this is not host-header injection</h2>
 *
 * The host comes from {@code X-Forwarded-Host}, which nginx fills from the
 * client-supplied {@code Host} — so it is attacker-influenced and cannot be
 * trusted on its own. Two things bound it:
 *
 * <ol>
 * <li>{@code bff.allowed-client-origins} is an explicit allowlist. An origin
 * that is not on it is ignored and the configured {@code client-uri} is used
 * instead, so an unknown host degrades to today's behaviour rather than
 * redirecting anywhere new.</li>
 * <li>The authorization server validates {@code redirect_uri} against the
 * client's registered list regardless. An origin that somehow reached here
 * without being registered fails there.</li>
 * </ol>
 *
 * Both have to be widened for a new domain to work, which is the point: adding a
 * domain is a deliberate act in two places, not a header away.
 */
@Slf4j
@Configuration
public class MultiHostAuthorizationRequestResolver {

  /**
   * Overrides spring-addons' own resolver, which is declared
   * {@code @ConditionalOnMissingBean}.
   */
  @Bean
  ServerOAuth2AuthorizationRequestResolver authorizationRequestResolver(
      OAuth2ClientProperties bootClientProperties,
      ReactiveClientRegistrationRepository clientRegistrationRepository,
      SpringAddonsOidcProperties addonsProperties,
      WebFluxProperties serverProperties,
      @Value("${bff.allowed-client-origins:}") List<String> allowedOrigins) {

    final var delegate = new SpringAddonsServerOAuth2AuthorizationRequestResolver(
        bootClientProperties, clientRegistrationRepository, addonsProperties.getClient(),
        serverProperties);

    final Set<String> allowed = allowedOrigins.stream()
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .map(origin -> {
          final var normalized = normalize(origin);
          if (normalized == null) {
            // Misconfiguration, not user input: fail the boot rather than start
            // with a silently smaller allowlist than the operator intended.
            throw new IllegalStateException(
                "bff.allowed-client-origins contains an unparseable origin: " + origin);
          }
          return normalized;
        })
        .collect(Collectors.toUnmodifiableSet());

    if (allowed.isEmpty()) {
      log.info("bff.allowed-client-origins is empty; redirect_uri stays pinned to client-uri");
    } else {
      log.info("Multi-host logins enabled for origins {}", allowed);
    }

    return new ForwardedOriginResolver(delegate, allowed);
  }

  /**
   * Scheme + authority only, lower-cased — the comparison key. Null when the
   * input is not a parseable origin.
   *
   * <p>The value reaching this from a request header is attacker-influenced and
   * need not be a URI at all, so a parse failure is an expected input rather
   * than an exceptional one: it returns null and the caller falls back to
   * client-uri. Letting it throw turned a junk header into an unauthenticated
   * 500 on the login endpoint.
   */
  private static String normalize(String origin) {
    try {
      final var uri = new URI(origin);
      if (uri.getScheme() == null || uri.getHost() == null) {
        return null;
      }
      return UriComponentsBuilder.newInstance()
          .scheme(uri.getScheme())
          .host(uri.getHost())
          .port(uri.getPort())
          .build()
          .toUriString()
          .toLowerCase();
    } catch (URISyntaxException | IllegalArgumentException e) {
      return null;
    }
  }

  record ForwardedOriginResolver(
      ServerOAuth2AuthorizationRequestResolver delegate, Set<String> allowedOrigins)
      implements ServerOAuth2AuthorizationRequestResolver {

    @Override
    public Mono<OAuth2AuthorizationRequest> resolve(ServerWebExchange exchange) {
      return delegate.resolve(exchange).map(request -> retarget(request, exchange));
    }

    @Override
    public Mono<OAuth2AuthorizationRequest> resolve(
        ServerWebExchange exchange, String clientRegistrationId) {
      return delegate.resolve(exchange, clientRegistrationId)
          .map(request -> retarget(request, exchange));
    }

    private OAuth2AuthorizationRequest retarget(
        OAuth2AuthorizationRequest request, ServerWebExchange exchange) {
      if (request == null || request.getRedirectUri() == null) {
        return request;
      }

      final var origin = forwardedOrigin(exchange);
      if (origin == null || !allowedOrigins.contains(origin)) {
        log.debug("Origin {} is not allowlisted; leaving redirect_uri on client-uri", origin);
        return request;
      }

      final var current = URI.create(request.getRedirectUri());
      final var retargeted = UriComponentsBuilder.fromUriString(origin)
          .path(current.getPath())
          .query(current.getQuery())
          .fragment(current.getFragment())
          .build()
          .toUriString();

      log.debug("Retargeted redirect_uri {} -> {}", request.getRedirectUri(), retargeted);
      return OAuth2AuthorizationRequest.from(request).redirectUri(retargeted).build();
    }

    /**
     * The public origin from the proxy's headers, or null when the request did
     * not come through one.
     *
     * <p>Read here rather than via {@code server.forward-headers-strategy}: that
     * also applies {@code X-Forwarded-Prefix} to the request path, which
     * spring-addons then prepends {@code client-uri}'s own {@code /bff} to,
     * yielding {@code /bff/bff/login/...}. Only the scheme and authority are
     * wanted; the path is already correct.
     *
     * <p>Each header may carry a comma-separated chain when several proxies are
     * in front; the first entry is the original client-facing one.
     */
    private static String forwardedOrigin(ServerWebExchange exchange) {
      final var headers = exchange.getRequest().getHeaders();
      final var host = firstValue(headers.getFirst("X-Forwarded-Host"));
      if (host == null) {
        return null;
      }
      final var scheme = firstValue(headers.getFirst("X-Forwarded-Proto"));
      return normalize((scheme == null ? "https" : scheme) + "://" + host);
    }

    private static String firstValue(String header) {
      if (header == null || header.isBlank()) {
        return null;
      }
      final var first = header.split(",")[0].trim();
      return first.isEmpty() ? null : first;
    }
  }
}
