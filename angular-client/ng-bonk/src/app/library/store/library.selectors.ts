import { createSelector } from '@ngrx/store';
import { selectLibraryState } from './library.reducer';

export const selectShelves = createSelector(
  selectLibraryState,
  state => state.shelves
);

export const selectShelvesLoading = createSelector(
  selectLibraryState,
  state => state.loadingShelves
);

export const selectShelvesTotal = createSelector(
  selectLibraryState,
  state => state.total
);

export const selectShelfBooks = createSelector(
  selectLibraryState,
  state => state.shelfBooks
);

export const selectLoadingBooks = createSelector(
  selectLibraryState,
  state => state.loadingBooks
);

export const selectOpenLibraryResults = createSelector(
  selectLibraryState,
  state => state.searchResults
);

export const selectOpenLibraryTotal = createSelector(
  selectLibraryState,
  state => state.searchTotal
);

export const selectSearchLoading = createSelector(
  selectLibraryState,
  state => state.searchLoading
);

export const selectBooksForShelf = (shelfId: string) =>
  createSelector(selectShelfBooks, books => books[shelfId] || []);

export const selectShelfById = (shelfId: string) =>
  createSelector(selectShelves, shelves =>
    shelves.find(shelf => shelf.id === shelfId)
  );
