package com.gpt.jpss.keycloak;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Who am I — the signed-in user, provisioned on first contact. Requires auth, so
 * an unauthenticated caller gets 401, which the frontend reads as "not signed
 * in". Reached via the BFF at {@code /jps/me}.
 */
@RestController
@RequestMapping("/me")
@RequiredArgsConstructor
public class MeController {

  private final KeycloakUserService users;

  /** Must match the role StickerController enforces, or the UI offers what the API refuses. */
  @Value("${jpss.moderator-role:jpss-admin}")
  private String moderatorRole;

  @GetMapping
  public MeResponse me(Authentication auth) {
    KeycloakUser user = users.ensure(auth);
    return new MeResponse(user.getId(), user.getUsername(), isModerator(auth));
  }

  private boolean isModerator(Authentication auth) {
    return auth.getAuthorities().stream()
        .map(GrantedAuthority::getAuthority)
        .anyMatch(a -> moderatorRole.equals(a) || ("ROLE_" + moderatorRole).equals(a));
  }

  /**
   * {@code moderator} is a convenience for the UI only. It decides whether Edit
   * and Delete are drawn; it never decides whether they are allowed. The server
   * re-derives the same thing from the token on every mutating call.
   */
  public record MeResponse(UUID id, String username, boolean moderator) {
  }
}
