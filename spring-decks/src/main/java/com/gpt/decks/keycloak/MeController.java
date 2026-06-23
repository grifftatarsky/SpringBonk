package com.gpt.decks.keycloak;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Who am I — the signed-in user (provisioned on first contact). Requires auth,
 * so an unauthenticated caller gets 401, which the frontend reads as
 * "not signed in". Reached via the BFF at {@code /dck/me}.
 */
@RestController
@RequestMapping("/me")
@RequiredArgsConstructor
public class MeController {

  private final KeycloakUserService users;

  @GetMapping
  public MeResponse me(Authentication auth) {
    KeycloakUser user = users.ensure(auth);
    return new MeResponse(user.getId(), user.getUsername());
  }

  public record MeResponse(UUID id, String username) {
  }
}
