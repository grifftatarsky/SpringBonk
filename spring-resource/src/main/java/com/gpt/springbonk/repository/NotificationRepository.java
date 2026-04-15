package com.gpt.springbonk.repository;

import com.gpt.springbonk.model.Notification;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

  /**
   * Active inbox query. Returns unread notifications always, plus read ones
   * that were read within the given cutoff (e.g., last 7 days). Old read
   * notifications fall off the inbox automatically — they're not deleted,
   * just hidden from this query. If we ever want an "archive" view we can
   * add another method.
   */
  @Query("SELECT n FROM Notification n "
      + "WHERE n.recipient.id = :recipientId "
      + "AND (n.readAt IS NULL OR n.readAt > :readCutoff) "
      + "ORDER BY n.createdAt DESC")
  List<Notification> findActiveByRecipientId(
      @Param("recipientId") UUID recipientId,
      @Param("readCutoff") LocalDateTime readCutoff,
      Pageable pageable
  );

  long countByRecipientIdAndReadAtIsNull(UUID recipientId);

  @Modifying
  @Query("UPDATE Notification n SET n.readAt = CURRENT_TIMESTAMP "
      + "WHERE n.recipient.id = :recipientId AND n.readAt IS NULL")
  int markAllReadByRecipientId(@Param("recipientId") UUID recipientId);
}
