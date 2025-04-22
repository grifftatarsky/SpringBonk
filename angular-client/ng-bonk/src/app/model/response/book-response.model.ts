import { SimpleShelfResponse } from './simple-shelf-response.model';

export interface BookResponse {
  id: string;
  title: string;
  author: string;
  imageUrl: string;
  blurb: string;
  openLibraryId: string;
  shelves: SimpleShelfResponse[];
}
