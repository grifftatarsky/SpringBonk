export type BookStatus = 'UNREAD' | 'READING' | 'READ' | 'ABANDONED';

export interface UserBookStatusResponse {
  readonly id: string;
  readonly userId: string;
  readonly bookId: string;
  readonly status: BookStatus;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly abandonedAt: string | null;
  readonly updatedAt: string;
}

export interface UserBookStatusRequest {
  readonly status: BookStatus;
  readonly startedAt?: string | null;
  readonly finishedAt?: string | null;
  readonly abandonedAt?: string | null;
}
