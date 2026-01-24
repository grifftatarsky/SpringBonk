export interface BookRequest {
  title: string;
  author: string;
  imageURL: string;
  pitch: string;
  openLibraryId: string;
  shelfIds?: string[];
}
