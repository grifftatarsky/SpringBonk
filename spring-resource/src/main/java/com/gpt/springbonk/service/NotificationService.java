package com.gpt.springbonk.service;

import com.gpt.springbonk.constant.enumeration.notification.NotificationType;
import com.gpt.springbonk.model.dto.response.NotificationResponse;
import java.util.List;
import java.util.UUID;

public interface NotificationService {
  /**
   * Get a user's most recent notifications (newest first, capped).
   */
  List<NotificationResponse> getMyNotifications(UUID userId, int limit);

  long getUnreadCount(UUID userId);

  /**
   * Mark a single notification as read. Throws if the notification
   * doesn't belong to the requesting user.
   */
  void markRead(UUID userId, UUID notificationId);

  /**
   * Mark every unread notification for a user as read.
   */
  int markAllRead(UUID userId);

  /**
   * Fan out a notification to every registered user. Used by event
   * listeners when a global event (election opened, closed) happens.
   */
  void notifyAllUsers(String message, String href, NotificationType type);

  /**
   * Send a single notification to a specific user. Used for targeted
   * events like "someone liked your review".
   */
  void notifyUser(UUID recipientId, String message, String href, NotificationType type);
}
