package com.gpt.springbonk.service.impl;

import com.gpt.springbonk.constant.enumeration.notification.NotificationType;
import com.gpt.springbonk.exception.ResourceNotFoundException;
import com.gpt.springbonk.keycloak.KeycloakUser;
import com.gpt.springbonk.keycloak.KeycloakUserRepository;
import com.gpt.springbonk.model.Notification;
import com.gpt.springbonk.model.dto.response.NotificationResponse;
import com.gpt.springbonk.repository.NotificationRepository;
import com.gpt.springbonk.service.NotificationService;
import com.gpt.springbonk.service.event.ElectionClosedEvent;
import com.gpt.springbonk.service.event.ElectionOpenedEvent;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {
  private final NotificationRepository notificationRepository;
  private final KeycloakUserRepository keycloakUserRepository;

  private static final int DEFAULT_LIMIT = 50;
  private static final int MAX_LIMIT = 200;

  @Override
  public List<NotificationResponse> getMyNotifications(@NotNull UUID userId, int limit) {
    int effectiveLimit = limit <= 0 ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
    return notificationRepository
        .findByRecipientIdOrderByCreatedAtDesc(userId, PageRequest.of(0, effectiveLimit))
        .stream()
        .map(NotificationResponse::new)
        .toList();
  }

  @Override
  public long getUnreadCount(@NotNull UUID userId) {
    return notificationRepository.countByRecipientIdAndReadAtIsNull(userId);
  }

  @Override
  public void markRead(@NotNull UUID userId, @NotNull UUID notificationId) {
    Notification notification = notificationRepository.findById(notificationId)
        .orElseThrow(() -> new ResourceNotFoundException("Notification not found."));
    if (!notification.getRecipient().getId().equals(userId)) {
      throw new AccessDeniedException("Notification does not belong to this user.");
    }
    if (notification.getReadAt() == null) {
      notification.setReadAt(LocalDateTime.now());
      notificationRepository.saveAndFlush(notification);
    }
  }

  @Override
  public int markAllRead(@NotNull UUID userId) {
    return notificationRepository.markAllReadByRecipientId(userId);
  }

  @Override
  public void notifyAllUsers(String message, String href, NotificationType type) {
    List<UUID> recipientIds = keycloakUserRepository.findAllUserIds();
    if (recipientIds.isEmpty()) {
      return;
    }
    List<Notification> batch = new ArrayList<>(recipientIds.size());
    for (UUID recipientId : recipientIds) {
      // Use a reference so we don't round-trip for each user.
      KeycloakUser ref = keycloakUserRepository.getReferenceById(recipientId);
      batch.add(new Notification(ref, message, href, type));
    }
    notificationRepository.saveAll(batch);
  }

  // region Event listeners

  @EventListener
  public void onElectionOpened(ElectionOpenedEvent event) {
    String title = event.title() == null ? "Untitled" : event.title();
    String message = "New election open: " + title;
    String href = "/elections/" + event.electionId();
    notifyAllUsers(message, href, NotificationType.ELECTION_OPENED);
  }

  @EventListener
  public void onElectionClosed(ElectionClosedEvent event) {
    String title = event.title() == null ? "Untitled" : event.title();
    String message;
    NotificationType type;
    if (event.winnerTitle() != null && !event.winnerTitle().isBlank()) {
      message = title + " closed. Winner: " + event.winnerTitle() + ".";
      type = NotificationType.ELECTION_WON;
    } else {
      message = title + " closed.";
      type = NotificationType.ELECTION_CLOSED;
    }
    String href = "/elections/" + event.electionId();
    notifyAllUsers(message, href, type);
  }

  // endregion
}
