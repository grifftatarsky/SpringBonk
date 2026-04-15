package com.gpt.springbonk.constant.enumeration.notification;

/**
 * Categories for Notification records. Kept minimal for v1 —
 * notifications are primarily a message + optional link.
 */
public enum NotificationType {
  ELECTION_OPENED,
  ELECTION_CLOSED,
  ELECTION_WON,
  REVIEW_LIKED,
  REVIEW_COMMENTED,
  SYSTEM
}
