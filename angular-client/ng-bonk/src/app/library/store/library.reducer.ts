import { createFeature, createReducer, on } from '@ngrx/store';
import * as LibraryActions from './library.actions';
import { ShelfResponse } from '../../model/response/shelf-response.model';
import { BookResponse } from '../../model/response/book-response.model';
import { OpenLibraryBookResponse } from '../../model/response/open-library-book-response.model';

export interface LibraryState {
  shelves: ShelfResponse[];
  total: number;
  loadingShelves: boolean;
  shelfBooks: { [shelfId: string]: BookResponse[] };
  loadingBooks: { [shelfId: string]: boolean };
  searchResults: OpenLibraryBookResponse[];
  searchTotal: number;
  searchLoading: boolean;
}

export const initialState: LibraryState = {
  shelves: [],
  total: 0,
  loadingShelves: false,
  shelfBooks: {},
  loadingBooks: {},
  searchResults: [],
  searchTotal: 0,
  searchLoading: false,
};

const reducer = createReducer(
  initialState,
  on(
    LibraryActions.loadShelves,
      (state: LibraryState): LibraryState => ({
      ...state,
      loadingShelves: true,
    })
  ),
  on(
    LibraryActions.loadShelvesSuccess,
    (
      state: LibraryState,
      {
        shelves,
        total,
        pageIndex,
      }: { shelves: ShelfResponse[]; total: number; pageIndex: number }
    ): LibraryState => ({
      ...state,
      shelves:
        pageIndex > 0 ? [...state.shelves, ...shelves] : shelves,
      total,
      loadingShelves: false,
    })
  ),
  on(
    LibraryActions.createShelfSuccess,
    (state: LibraryState, { shelf }: { shelf: ShelfResponse }): LibraryState => ({
      ...state,
      shelves: [...state.shelves, shelf],
      total: state.total + 1,
    })
  ),
  on(
    LibraryActions.updateShelfSuccess,
    (state: LibraryState, { shelf }: { shelf: ShelfResponse }): LibraryState => ({
      ...state,
      shelves: state.shelves.map((s: ShelfResponse) =>
        s.id === shelf.id ? shelf : s
      ),
    })
  ),
  on(
    LibraryActions.deleteShelfSuccess,
    (state: LibraryState, { shelfId }: { shelfId: string }): LibraryState => {
      const { [shelfId]: removedBooks, ...remainingBooks } = state.shelfBooks;
      const { [shelfId]: removedLoading, ...remainingLoading } = state.loadingBooks;
      return {
        ...state,
      shelves: state.shelves.filter(
        (s: ShelfResponse) => s.id !== shelfId
      ),
        total: state.total > 0 ? state.total - 1 : 0,
        shelfBooks: remainingBooks,
        loadingBooks: remainingLoading,
      };
    }
  ),
  on(
    LibraryActions.loadShelfBooks,
    (state: LibraryState, { shelfId }: { shelfId: string }): LibraryState => ({
      ...state,
      loadingBooks: { ...state.loadingBooks, [shelfId]: true },
    })
  ),
  on(
    LibraryActions.loadShelfBooksSuccess,
    (
      state: LibraryState,
      { shelfId, books }: { shelfId: string; books: BookResponse[] }
    ): LibraryState => ({
      ...state,
      shelfBooks: { ...state.shelfBooks, [shelfId]: books },
      loadingBooks: { ...state.loadingBooks, [shelfId]: false },
    })
  ),
  on(
    LibraryActions.addBookSuccess,
    (
        state: LibraryState,
      { shelfId, book }: { shelfId: string; book: BookResponse }
    ): LibraryState => ({
      ...state,
      shelfBooks: {
        ...state.shelfBooks,
        [shelfId]: [...(state.shelfBooks[shelfId] || []), book],
      },
    })
  ),
  on(
    LibraryActions.removeBookFromShelfSuccess,
    (
      state: LibraryState,
      { bookId, shelfId }: { bookId: string; shelfId: string }
    ): LibraryState => ({
      ...state,
      shelfBooks: {
        ...state.shelfBooks,
        [shelfId]: (state.shelfBooks[shelfId] || []).filter(
          (b: BookResponse) => b.id !== bookId
        ),
      },
    })
  ),
  on(
    LibraryActions.deleteBookSuccess,
    (state: LibraryState, { bookId }: { bookId: string }): LibraryState => {
    const updatedShelfBooks = Object.keys(state.shelfBooks).reduce(
      (
        acc: { [key: string]: BookResponse[] },
        key: string
      ) => ({
        ...acc,
        [key]: state.shelfBooks[key].filter(
          (b: BookResponse) => b.id !== bookId
        ),
      }),
      {} as { [key: string]: BookResponse[] }
    );
      return {
        ...state,
        shelfBooks: updatedShelfBooks,
      };
    }
  ),
  on(
    LibraryActions.searchOpenLibrary,
    (state: LibraryState): LibraryState => ({
      ...state,
      searchLoading: true,
    })
  ),
  on(
    LibraryActions.searchOpenLibrarySuccess,
    (
      state: LibraryState,
      {
        results,
        total,
        pageIndex,
      }: { results: OpenLibraryBookResponse[]; total: number; pageIndex: number }
    ): LibraryState => ({
      ...state,
      searchResults:
        pageIndex && pageIndex > 0
          ? [...state.searchResults, ...results]
          : results,
      searchTotal: total,
      searchLoading: false,
    })
  ),
  on(
    LibraryActions.searchOpenLibraryFailure,
    (state: LibraryState): LibraryState => ({
      ...state,
      searchLoading: false,
    })
  )
);

export const libraryFeature = createFeature({
  name: 'library',
  reducer,
});

export const {
  name: libraryFeatureKey,
  reducer: libraryReducer,
  selectLibraryState,
} = libraryFeature;
