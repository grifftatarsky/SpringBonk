import { SimpleShelfResponse } from './simple-shelf-response.model';

export interface BookResponse {
  id: string;
  title: string;
  author: string;
  imageURL: string;
  blurb: string;
  openLibraryId: string;
  shelves: SimpleShelfResponse[];
  publishedYear?: number;
}
