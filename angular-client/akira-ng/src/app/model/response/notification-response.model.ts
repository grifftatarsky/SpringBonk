/**
 * Matches the backend `Notification` entity.
 * Minimal: message + optional link + type + timestamps.
 * Types currently emitted by the backend:
 *   ELECTION_OPENED, ELECTION_CLOSED, ELECTION_WON, SYSTEM
 */
export type NotificationType =
  | 'ELECTION_OPENED'
  | 'ELECTION_CLOSED'
  | 'ELECTION_WON'
  | 'REVIEW_LIKED'
  | 'REVIEW_COMMENTED'
  | 'SYSTEM';

export interface NotificationResponse {
  readonly id: string;
  readonly message: string;
  readonly href: string | null;
  readonly type: NotificationType;
  readonly createdAt: string;
  readonly readAt: string | null;
}
