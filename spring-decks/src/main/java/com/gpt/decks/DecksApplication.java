package com.gpt.decks;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/// Real-time card-game service. Hosts the lobby (games, seats, ready/start) and,
/// in the next phase, the authoritative game engine + STOMP runtime. Built to
/// host multiple card games; President is the first.
///
/// {@link EnableJpaAuditing} populates {@code BaseEntity}'s created/updated
/// timestamps.
@EnableJpaAuditing
@SpringBootApplication
public class DecksApplication {

  public static void main(String[] args) {
    SpringApplication.run(DecksApplication.class, args);
  }
}
