/** One sticker as the wall serves it. Mirrors jpss-resource's StickerResponse. */
export interface Sticker {
  readonly id: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly comment: string | null;
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
  /** Whether this account may edit and delete other people's stickers. */
  readonly moderator: boolean;
}

/** The editable half of a sticker — everything except the photo. */
export interface StickerEdit {
  readonly latitude: number;
  readonly longitude: number;
  readonly comment: string | null;
  readonly place: string | null;
}

/** A spot on the globe, before it becomes a sticker. */
export interface Coordinate {
  readonly longitude: number;
  readonly latitude: number;
}

/**
 * The one way coordinates are written for people: four decimal places — about
 * ten metres, finer than anyone places a pin — with a hemisphere letter instead
 * of a minus sign. Shared so the sidebar, the composer and the photo-location
 * prompt cannot drift into three dialects of the same number.
 */
export function formatCoordinate({ latitude, longitude }: Coordinate): string {
  const ns = `${Math.abs(latitude).toFixed(4)}\u00b0 ${latitude < 0 ? 'S' : 'N'}`;
  const ew = `${Math.abs(longitude).toFixed(4)}\u00b0 ${longitude < 0 ? 'W' : 'E'}`;
  return `${ns}, ${ew}`;
}

/**
 * The one-line label a sticker is listed under.
 *
 * Both the caption and the place are optional, so this falls through to the
 * coordinate rather than rendering an empty row: every list that shows stickers
 * — the menu, the hover label, the screen-reader wall — needs *something*, and
 * where it is is the one thing a sticker always has.
 */
export function stickerLabel(sticker: Sticker): string {
  return sticker.place ?? sticker.comment ?? formatCoordinate(sticker);
}
