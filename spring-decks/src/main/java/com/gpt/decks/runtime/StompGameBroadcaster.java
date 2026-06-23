package com.gpt.decks.runtime;

import com.gpt.decks.engine.president.GameEvent;
import com.gpt.decks.engine.president.GameState;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * Broadcasts events to {@code /topic/games/{id}} via the simple broker. Scaling
 * to multiple instances swaps the simple broker for a RabbitMQ STOMP relay —
 * this code is unchanged.
 */
@Component
@RequiredArgsConstructor
public class StompGameBroadcaster implements GameBroadcaster {

  private final SimpMessagingTemplate messaging;

  @Override
  public void events(UUID gameId, List<GameEvent> events) {
    String destination = "/topic/games/" + gameId;
    for (GameEvent event : events) {
      messaging.convertAndSend(destination, event);
    }
  }

  @Override
  public void state(UUID gameId, String playerId, GameState view) {
    // Delivered to /user/queue/games/{gameId} for the session bound to playerId.
    messaging.convertAndSendToUser(playerId, "/queue/games/" + gameId, view);
  }
}
