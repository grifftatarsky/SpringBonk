export interface BookRequest {
  title: string;
  author: string;
  imageURL: string;
  blurb: string;
  openLibraryId: string;
  shelfIds?: string[];
}
