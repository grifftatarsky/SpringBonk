package com.gpt.decks.keycloak;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Thin local mirror of a Keycloak user, the FK target for game ownership/seats.
 * The id is the Keycloak {@code sub}. Rows are provisioned just-in-time from the
 * JWT on first authenticated contact (see {@link KeycloakUserService}); users
 * are managed in Keycloak, this table just gives us a stable local id +
 * last-seen (for the inactivity closer) without replicating Keycloak's schema.
 */
@Entity
@Table(name = "keycloak_user")
@Getter
@Setter
@NoArgsConstructor
public class KeycloakUser {

  @Id
  @Column(updatable = false, nullable = false)
  private UUID id;

  @Column(nullable = false)
  private String username;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private Instant lastSeen;

  public KeycloakUser(UUID id, String username, Instant now) {
    this.id = id;
    this.username = username;
    this.createdAt = now;
    this.lastSeen = now;
  }
}
