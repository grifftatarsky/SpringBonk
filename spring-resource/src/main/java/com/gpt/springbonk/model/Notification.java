package com.gpt.springbonk.model;

import com.gpt.springbonk.constant.enumeration.notification.NotificationType;
import com.gpt.springbonk.keycloak.KeycloakUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/**
 * A user-addressable notification. Minimal by design: a message and an
 * optional link. The link is a text field — the frontend decides whether
 * to treat it as an internal route (leading slash) or an external URL.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "notifications")
public class Notification {
  @Id
  @GeneratedValue
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "recipient_id", nullable = false)
  private KeycloakUser recipient;

  @Column(name = "message", nullable = false, length = 1000)
  private String message;

  /** Optional link. Internal routes start with "/", external are full URLs. */
  @Column(name = "href", length = 500)
  private String href;

  @Enumerated(EnumType.STRING)
  @Column(name = "type", nullable = false, length = 40)
  private NotificationType type;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(name = "read_at")
  private LocalDateTime readAt;

  public Notification(KeycloakUser recipient, String message, String href, NotificationType type) {
    this.recipient = recipient;
    this.message = message;
    this.href = href;
    this.type = type;
  }
}
