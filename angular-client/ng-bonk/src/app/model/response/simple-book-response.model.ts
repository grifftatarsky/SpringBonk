/**
 * A lightweight summary of a book object, typically used for display.
 */
export interface SimpleBookResponse {
  id: string;         // UUID
  title: string;
  author: string;
  imageURL: string;
  blurb: string;
  googleID: string;
}
