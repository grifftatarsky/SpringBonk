export type ActivityItemType =
  | 'REVIEW_POSTED'
  | 'STARTED_READING'
  | 'FINISHED_READING'
  | 'ABANDONED';

export interface ActivityItemResponse {
  readonly type: ActivityItemType;
  readonly occurredAt: string;
  readonly actorId: string;
  readonly actorName: string;
  readonly bookId: string;
  readonly bookTitle: string;
  readonly bookAuthor: string;
  readonly bookImageUrl: string | null;
  readonly reviewId: string | null;
  readonly reviewRating: number | null;
  readonly reviewExcerpt: string | null;
}
