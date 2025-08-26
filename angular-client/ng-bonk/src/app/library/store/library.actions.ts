import { createAction, props } from '@ngrx/store';
import { ShelfResponse } from '../../model/response/shelf-response.model';
import { BookResponse } from '../../model/response/book-response.model';
import { ShelfRequest } from '../../model/request/shelf-request.model';
import { OpenLibraryBookResponse } from '../../model/response/open-library-book-response.model';

export const loadShelves = createAction(
  '[Library] Load Shelves',
  props<{ pageIndex?: number; pageSize?: number }>()
);
export const loadShelvesSuccess = createAction(
  '[Library] Load Shelves Success',
  props<{ shelves: ShelfResponse[]; total: number }>()
);
export const loadShelvesFailure = createAction('[Library] Load Shelves Failure');

export const createShelf = createAction(
  '[Library] Create Shelf',
  props<{ request: ShelfRequest }>()
);
export const createShelfSuccess = createAction(
  '[Library] Create Shelf Success',
  props<{ shelf: ShelfResponse }>()
);

export const updateShelf = createAction(
  '[Library] Update Shelf',
  props<{ shelfId: string; request: ShelfRequest }>()
);
export const updateShelfSuccess = createAction(
  '[Library] Update Shelf Success',
  props<{ shelf: ShelfResponse }>()
);

export const deleteShelf = createAction(
  '[Library] Delete Shelf',
  props<{ shelfId: string }>()
);
export const deleteShelfSuccess = createAction(
  '[Library] Delete Shelf Success',
  props<{ shelfId: string }>()
);

export const loadShelfBooks = createAction(
  '[Library] Load Shelf Books',
  props<{ shelfId: string }>()
);
export const loadShelfBooksSuccess = createAction(
  '[Library] Load Shelf Books Success',
  props<{ shelfId: string; books: BookResponse[] }>()
);

export const addBookFromOpenLibrary = createAction(
  '[Library] Add Book From OpenLibrary',
  props<{ book: OpenLibraryBookResponse; shelfId: string }>()
);
export const addBookSuccess = createAction(
  '[Library] Add Book Success',
  props<{ shelfId: string; book: BookResponse }>()
);

export const removeBookFromShelf = createAction(
  '[Library] Remove Book From Shelf',
  props<{ bookId: string; shelfId: string }>()
);
export const removeBookFromShelfSuccess = createAction(
  '[Library] Remove Book From Shelf Success',
  props<{ bookId: string; shelfId: string }>()
);

export const deleteBook = createAction(
  '[Library] Delete Book',
  props<{ bookId: string }>()
);
export const deleteBookSuccess = createAction(
  '[Library] Delete Book Success',
  props<{ bookId: string }>()
);

export const searchOpenLibrary = createAction(
  '[Library] Search OpenLibrary',
  props<{ query: string; sort?: string; pageIndex?: number; pageSize?: number }>()
);
export const searchOpenLibrarySuccess = createAction(
  '[Library] Search OpenLibrary Success',
  props<{ results: OpenLibraryBookResponse[]; total: number }>()
);
export const searchOpenLibraryFailure = createAction(
  '[Library] Search OpenLibrary Failure'
);

