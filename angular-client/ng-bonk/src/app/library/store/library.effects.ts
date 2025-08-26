import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import * as LibraryActions from './library.actions';
import { ShelfHttpService } from '../../service/http/shelves-http.service';
import { BookHttpService } from '../../service/http/books-http.service';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { BookRequest } from '../../model/request/book-request.model';

@Injectable()
export class LibraryEffects {
  private actions$ = inject(Actions);
  private shelfHttp = inject(ShelfHttpService);
  private bookHttp = inject(BookHttpService);

  loadShelves$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LibraryActions.loadShelves),
      tap(({ pageIndex = 0, pageSize = 10 }) =>
        console.log('[LibraryEffects] loadShelves', { pageIndex, pageSize })
      ),
      switchMap(({ pageIndex = 0, pageSize = 10 }) =>
        this.shelfHttp.getPagedShelves(pageIndex, pageSize).pipe(
          tap(res =>
            console.log('[LibraryEffects] loadShelves success', {
              total: res.page.totalElements,
            })
          ),
          map(res => {
            const embeddedKey = Object.keys(res._embedded)[0];
            return LibraryActions.loadShelvesSuccess({
              shelves: res._embedded[embeddedKey],
              total: res.page.totalElements,
            });
          }),
          catchError(error => {
            console.error('[LibraryEffects] loadShelves failure', error);
            return of(LibraryActions.loadShelvesFailure());
          })
        )
      )
    )
  );

  createShelf$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LibraryActions.createShelf),
      switchMap(({ request }) =>
        this.shelfHttp
          .createShelf(request)
          .pipe(map(shelf => LibraryActions.createShelfSuccess({ shelf })))
      )
    )
  );

  updateShelf$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LibraryActions.updateShelf),
      switchMap(({ shelfId, request }) =>
        this.shelfHttp
          .updateShelf(shelfId, request)
          .pipe(map(shelf => LibraryActions.updateShelfSuccess({ shelf })))
      )
    )
  );

  deleteShelf$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LibraryActions.deleteShelf),
      switchMap(({ shelfId }) =>
        this.shelfHttp
          .deleteShelf(shelfId)
          .pipe(map(() => LibraryActions.deleteShelfSuccess({ shelfId })))
      )
    )
  );

  loadShelfBooks$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LibraryActions.loadShelfBooks),
      tap(({ shelfId }) =>
        console.log('[LibraryEffects] loadShelfBooks', { shelfId })
      ),
      switchMap(({ shelfId }) =>
        this.bookHttp.getBooksByShelfId(shelfId).pipe(
          tap(books =>
            console.log('[LibraryEffects] loadShelfBooks success', {
              shelfId,
              count: books.length,
            })
          ),
          map(books => LibraryActions.loadShelfBooksSuccess({ shelfId, books })),
          catchError(error => {
            console.error('[LibraryEffects] loadShelfBooks failure', error);
            return of(
              LibraryActions.loadShelfBooksSuccess({ shelfId, books: [] })
            );
          })
        )
      )
    )
  );

  addBookFromOpenLibrary$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LibraryActions.addBookFromOpenLibrary),
      tap(({ shelfId, book }) =>
        console.log('[LibraryEffects] addBookFromOpenLibrary', {
          shelfId,
          title: book.title,
        })
      ),
      switchMap(({ book, shelfId }) => {
        const payload: BookRequest = {
          title: book.title,
          author: book.author_name?.[0] || 'Unknown',
          imageURL: book.cover_i
            ? this.bookHttp.getOpenLibraryCoverImageUrl(book.cover_i, 'L')
            : '',
          blurb: 'No blurb added. TODO!',
          openLibraryId: book.key,
          shelfIds: [shelfId],
        };
        return this.bookHttp.createBook(payload).pipe(
          tap(created =>
            console.log('[LibraryEffects] addBookFromOpenLibrary success', {
              shelfId,
              bookId: created.id,
            })
          ),
          map(created =>
            LibraryActions.addBookSuccess({ shelfId, book: created })
          )
        );
      })
    )
  );

  removeBookFromShelf$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LibraryActions.removeBookFromShelf),
      switchMap(({ bookId, shelfId }) =>
        this.bookHttp
          .removeBookFromShelf(bookId, shelfId)
          .pipe(map(() => LibraryActions.removeBookFromShelfSuccess({ bookId, shelfId })))
      )
    )
  );

  deleteBook$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LibraryActions.deleteBook),
      switchMap(({ bookId }) =>
        this.bookHttp
          .deleteBook(bookId)
          .pipe(map(() => LibraryActions.deleteBookSuccess({ bookId })))
      )
    )
  );

  searchOpenLibrary$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LibraryActions.searchOpenLibrary),
      tap(({ query, sort }) =>
        console.log('[LibraryEffects] searchOpenLibrary', { query, sort })
      ),
      switchMap(({ query, sort = 'relevance', pageIndex = 0, pageSize = 10 }) =>
        this.bookHttp
          .getOpenLibraryBooks(pageIndex, pageSize, query, sort)
          .pipe(
            tap(res =>
              console.log('[LibraryEffects] searchOpenLibrary success', {
                total: res.num_found,
              })
            ),
            map(res =>
              LibraryActions.searchOpenLibrarySuccess({
                results: res.docs,
                total: res.num_found,
              })
            ),
            catchError(error => {
              console.error('[LibraryEffects] searchOpenLibrary failure', error);
              return of(LibraryActions.searchOpenLibraryFailure());
            })
          )
      )
    )
  );
}

