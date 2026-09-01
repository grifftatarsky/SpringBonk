package com.gpt.jpss;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/// Jo Peace Sticker Service — geotagged photo "stickers" pinned to a shared
/// globe. Anyone can read the wall; posting requires a Keycloak session, and a
/// sticker can only be edited or removed by the account that placed it.
///
/// {@link EnableJpaAuditing} populates {@link com.gpt.jpss.model.BaseEntity}'s
/// created/updated timestamps.
@EnableJpaAuditing
@SpringBootApplication
public class JpssApplication {

  public static void main(String[] args) {
    SpringApplication.run(JpssApplication.class, args);
  }
}
