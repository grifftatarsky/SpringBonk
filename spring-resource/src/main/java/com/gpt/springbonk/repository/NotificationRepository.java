package com.gpt.springbonk.repository;

import com.gpt.springbonk.model.Notification;
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

  List<Notification> findByRecipientIdOrderByCreatedAtDesc(UUID recipientId, Pageable pageable);

  long countByRecipientIdAndReadAtIsNull(UUID recipientId);

  @Modifying
  @Query("UPDATE Notification n SET n.readAt = CURRENT_TIMESTAMP "
      + "WHERE n.recipient.id = :recipientId AND n.readAt IS NULL")
  int markAllReadByRecipientId(@Param("recipientId") UUID recipientId);
}
