package com.gpt.decks.realtime;

import com.gpt.decks.keycloak.KeycloakUser;
import com.gpt.decks.keycloak.KeycloakUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Mints a WebSocket ticket for the signed-in user (reached via the BFF at
 * {@code POST /dck/ws-ticket}). Requires auth, so the ticket is bound to the
 * authenticated subject.
 */
@RestController
@RequestMapping("/ws-ticket")
@RequiredArgsConstructor
public class WsTicketController {

  private final KeycloakUserService users;
  private final WsTicketService tickets;

  @PostMapping
  public TicketResponse issue(Authentication auth) {
    KeycloakUser me = users.ensure(auth);
    return new TicketResponse(tickets.issue(me.getId().toString()));
  }

  public record TicketResponse(String ticket) {
  }
}
