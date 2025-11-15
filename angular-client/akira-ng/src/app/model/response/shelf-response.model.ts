import { SimpleBookResponse } from './simple-book-response.model';

export interface ShelfResponse {
  id: string;
  title: string;
  createdDate: string;
  userId: string;
  defaultShelf: boolean;
  books: SimpleBookResponse[];
}
