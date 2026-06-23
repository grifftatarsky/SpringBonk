package com.gpt.decks.realtime;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/**
 * Short-lived, one-time WebSocket tickets. The browser can't put the JWT in the
 * STOMP frame (the BFF keeps it server-side), so it fetches a ticket over the
 * authenticated HTTP path and presents it in the STOMP CONNECT frame; we map it
 * back to the Keycloak subject. Issued bound to a {@code sub}, consumed once.
 */
@Service
public class WsTicketService {

  private static final long TTL_SECONDS = 60;

  private record Entry(String sub, Instant expiresAt) {
  }

  private final Map<String, Entry> tickets = new ConcurrentHashMap<>();

  public String issue(String sub) {
    String ticket = UUID.randomUUID().toString();
    tickets.put(ticket, new Entry(sub, Instant.now().plusSeconds(TTL_SECONDS)));
    return ticket;
  }

  public Optional<String> consume(String ticket) {
    if (ticket == null) {
      return Optional.empty();
    }
    Entry entry = tickets.remove(ticket);
    if (entry == null || entry.expiresAt().isBefore(Instant.now())) {
      return Optional.empty();
    }
    return Optional.of(entry.sub());
  }
}
