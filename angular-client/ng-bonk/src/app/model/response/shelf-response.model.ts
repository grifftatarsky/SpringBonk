import { SimpleBookResponse } from './simple-book-response.model';

/**
 * ShelfResponse represents the data received from the server
 * after querying a Shelf entity.
 */
export interface ShelfResponse {
  id: string;
  title: string;
  createdDate: string;
  userID: string;
  defaultShelf: boolean;
  books: SimpleBookResponse[];
}
