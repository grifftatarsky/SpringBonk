package com.gpt.springbonk.model;

import com.gpt.springbonk.constant.enumeration.reading.BookStatus;
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
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * Per-user read state for a single book. One row per (user, book) pair.
 *
 * `status` is the current state; the `startedAt` / `finishedAt` /
 * `abandonedAt` timestamps are set when those transitions happen so the
 * activity feed has dates to anchor "started reading X" events against,
 * without needing a separate history table.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(
    name = "user_book_statuses",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_user_book_status_user_book",
            columnNames = {"user_id", "book_id"}
        )
    }
)
public class UserBookStatus {
  @Id
  @GeneratedValue
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private KeycloakUser user;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "book_id", nullable = false)
  private Book book;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 32)
  private BookStatus status = BookStatus.UNREAD;

  @Column(name = "started_at")
  private LocalDateTime startedAt;

  @Column(name = "finished_at")
  private LocalDateTime finishedAt;

  @Column(name = "abandoned_at")
  private LocalDateTime abandonedAt;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  public UserBookStatus(KeycloakUser user, Book book, BookStatus status) {
    this.user = user;
    this.book = book;
    this.status = status;
  }
}
