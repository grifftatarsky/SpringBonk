/**
 * BookRequest represents the payload sent to the server
 * to create or update a Book.
 */
export interface BookRequest {
  title: string;
  author: string;
  imageURL: string;
  blurb: string;
  openLibraryId: string;
  shelfIds?: string[];
}
