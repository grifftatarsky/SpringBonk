import { initialState, libraryReducer } from './library.reducer';
import * as LibraryActions from '../action/library.actions';
import { ShelfResponse } from '../../model/response/shelf-response.model';
import { BookResponse } from '../../model/response/book-response.model';
import {
  selectBooksForShelf,
  selectShelfById,
} from '../selector/library.selectors';

describe('Library Reducer', () => {
  it('should return the initial state', () => {
    const action = { type: 'Unknown' } as any;
    const state = libraryReducer(undefined, action);
    expect(state).toEqual(initialState);
  });

  it('should handle loadShelvesSuccess', () => {
    const shelves: ShelfResponse[] = [
      {
        id: '1',
        title: 'Test',
        createdDate: '',
        userID: '',
        defaultShelf: false,
        books: [],
      },
    ];
    const action = LibraryActions.loadShelvesSuccess({
      shelves,
      total: 1,
      pageIndex: 0,
    });
    const state = libraryReducer(initialState, action);
    expect(state.shelves.length).toBe(1);
    expect(state.total).toBe(1);
    expect(state.loadingShelves).toBeFalse();
  });

  it('should handle addBookSuccess', () => {
    const starting = { ...initialState, shelfBooks: { '1': [] } };
    const book: BookResponse = {
      id: 'b1',
      title: 'Book',
      author: 'Author',
      imageURL: '',
      blurb: '',
      openLibraryId: '',
      shelves: [],
    };
    const action = LibraryActions.addBookSuccess({ shelfId: '1', book });
    const state = libraryReducer(starting, action);
    expect(state.shelfBooks['1'].length).toBe(1);
  });

  it('should select shelf by id and books for shelf', () => {
    const shelf: ShelfResponse = {
      id: '1',
      title: 'Shelf',
      createdDate: '',
      userID: '',
      defaultShelf: false,
      books: [],
    };
    const book: BookResponse = {
      id: 'b1',
      title: 'Book',
      author: 'Author',
      imageURL: '',
      blurb: '',
      openLibraryId: '',
      shelves: [],
    };
    const state = {
      ...initialState,
      shelves: [shelf],
      shelfBooks: { '1': [book] },
    };
    const rootState = { library: state } as any;
    const selectedShelf = selectShelfById('1')(rootState);
    const books = selectBooksForShelf('1')(rootState);
    expect(selectedShelf?.title).toBe('Shelf');
    expect(books.length).toBe(1);
  });
});
