export interface ReviewResponse {
  readonly id: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly bookId: string;
  readonly bookTitle: string;
  readonly bookAuthor: string;
  readonly bookImageUrl: string;
  readonly rating: number | null;
  readonly body: string;
  readonly createdDate: string;
  readonly updatedDate: string;
  readonly likeCount: number;
  readonly likedByMe: boolean;
  readonly commentCount: number;
}

export interface ReviewRequest {
  readonly bookId: string;
  readonly body: string;
  readonly rating: number | null;
}

export interface ReviewCommentResponse {
  readonly id: string;
  readonly reviewId: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly body: string;
  readonly createdDate: string;
}

export interface ReviewCommentRequest {
  readonly body: string;
}
