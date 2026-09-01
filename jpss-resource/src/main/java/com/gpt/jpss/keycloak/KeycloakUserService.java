package com.gpt.jpss.keycloak;

import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.StandardClaimNames;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Provisions/refreshes the thin {@link KeycloakUser} from the JWT — the same
 * pattern spring-decks uses. Call {@link #ensure} at the top of any
 * authenticated request that needs the local user record; it upserts the row
 * (id = {@code sub}, name = {@code preferred_username}) and bumps last-seen.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class KeycloakUserService {

  private final KeycloakUserRepository repository;

  /** The local user for an authenticated request, created on first contact. */
  public KeycloakUser ensure(Authentication auth) {
    if (!(auth instanceof JwtAuthenticationToken jwt)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
    }
    var claims = jwt.getTokenAttributes();
    UUID id = UUID.fromString((String) claims.get(StandardClaimNames.SUB));
    String username =
        (String) claims.getOrDefault(StandardClaimNames.PREFERRED_USERNAME, auth.getName());
    Instant now = Instant.now();

    return repository.findById(id)
        .map(existing -> {
          existing.setUsername(username);
          existing.setLastSeen(now);
          return existing;
        })
        .orElseGet(() -> repository.save(new KeycloakUser(id, username, now)));
  }
}
