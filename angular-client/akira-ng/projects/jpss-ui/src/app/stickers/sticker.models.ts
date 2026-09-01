/** One sticker as the wall serves it. Mirrors jpss-resource's StickerResponse. */
export interface Sticker {
  readonly id: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly comment: string;
  readonly place: string | null;
  readonly imageContentType: string;
  readonly imageWidth: number;
  readonly imageHeight: number;
  /** ISO-8601, as Jackson writes an Instant. */
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** The signed-in user, per the sticker backend. Null means "not signed in". */
export interface CurrentUser {
  readonly id: string;
  readonly username: string;
}

/** The editable half of a sticker — everything except the photo. */
export interface StickerEdit {
  readonly latitude: number;
  readonly longitude: number;
  readonly comment: string;
  readonly place: string | null;
}

/** A spot on the globe, before it becomes a sticker. */
export interface Coordinate {
  readonly longitude: number;
  readonly latitude: number;
}
