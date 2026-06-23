package com.gpt.decks.realtime;

import com.gpt.decks.engine.president.Action;
import com.gpt.decks.runtime.GameRuntime;
import com.gpt.decks.runtime.GameSession;
import java.security.Principal;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

/**
 * STOMP command intake. The session principal is the Keycloak subject (bound at
 * CONNECT by {@link StompAuthChannelInterceptor}); a player may only act as
 * themselves. Accepted commands are enqueued on the game's actor (single writer),
 * where the engine still validates legality/turn order.
 */
@Controller
@RequiredArgsConstructor
public class GameSocketController {

  private final GameRuntime runtime;

  @MessageMapping("/games/{id}/command")
  public void command(@DestinationVariable UUID id, @Payload Action action, Principal principal) {
    // The session's principal is the Keycloak sub; a player may only act as self.
    if (principal == null || !principal.getName().equals(action.playerId())) {
      return;
    }
    runtime.session(id).ifPresent(session -> session.submit(action));
  }

  @MessageMapping("/games/{id}/next")
  public void next(@DestinationVariable UUID id, Principal principal) {
    if (principal == null) {
      return;
    }
    runtime.session(id).ifPresent(GameSession::nextRound);
  }
}
