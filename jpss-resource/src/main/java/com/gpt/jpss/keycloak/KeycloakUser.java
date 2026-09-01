package com.gpt.jpss.keycloak;

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
 * Thin local mirror of a Keycloak user — the FK target for sticker authorship.
 * The id is the Keycloak {@code sub}. Rows are provisioned just-in-time from the
 * JWT on first authenticated contact (see {@link KeycloakUserService}).
 *
 * <p>The username is mirrored rather than looked up per request so the public
 * wall can render an author name without a token, and it is refreshed on every
 * authenticated call so a rename in Keycloak lands here on the user's next visit.
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
