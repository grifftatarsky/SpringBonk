import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import * as LibraryActions from '../action/library.actions';
import { ShelfHttpService } from '../../service/http/shelves-http.service';
import { BookHttpService } from '../../service/http/books-http.service';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { BookRequest } from '../../model/request/book-request.model';

@Injectable()
export class LibraryEffects {
  // TODO __ Might be able to remove the any here
  private actions$: Actions<any> = inject(Actions);
  private shelfHttpService: ShelfHttpService = inject(ShelfHttpService);
  private bookHttpService: BookHttpService = inject(BookHttpService);

  loadShelves$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LibraryActions.loadShelves),
      tap(({ pageIndex = 0, pageSize = 10 }) =>
        console.log('[LibraryEffects] loadShelves', { pageIndex, pageSize })
      ),
      switchMap(({ pageIndex = 0, pageSize = 10 }) =>
        this.shelfHttpService.getPagedShelves(pageIndex, pageSize).pipe(
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
              pageIndex,
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
        this.shelfHttpService
          .createShelf(request)
          .pipe(map(shelf => LibraryActions.createShelfSuccess({ shelf })))
      )
    )
  );

  updateShelf$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LibraryActions.updateShelf),
      switchMap(({ shelfId, request }) =>
        this.shelfHttpService
          .updateShelf(shelfId, request)
          .pipe(map(shelf => LibraryActions.updateShelfSuccess({ shelf })))
      )
    )
  );

  deleteShelf$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LibraryActions.deleteShelf),
      switchMap(({ shelfId }) =>
        this.shelfHttpService
          .deleteShelf(shelfId)
          .pipe(map(() => LibraryActions.deleteShelfSuccess({ shelfId })))
      )
    )
  );

  loadShelfBooks$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LibraryActions.loadShelfBooks),
      tap(({ shelfId, pageIndex = 0, pageSize = 20 }) =>
        console.log('[LibraryEffects] loadShelfBooks', {
          shelfId,
          pageIndex,
          pageSize,
        })
      ),
      switchMap(({ shelfId, pageIndex = 0, pageSize = 20 }) =>
        this.bookHttpService
          .getPagedBooksByShelfId(shelfId, pageIndex, pageSize)
          .pipe(
            tap(res =>
              console.log('[LibraryEffects] loadShelfBooks success', {
                shelfId,
                returned: Object.values(res._embedded)[0]?.length ?? 0,
                total: res.page.totalElements,
                page: res.page.number,
              })
            ),
            map(res => {
              const embeddedKey = Object.keys(res._embedded)[0];
              return LibraryActions.loadShelfBooksSuccess({
                shelfId,
                books: res._embedded[embeddedKey],
                total: res.page.totalElements,
                pageIndex,
              });
            }),
            catchError(error => {
              console.error('[LibraryEffects] loadShelfBooks failure', error);
              return of(
                LibraryActions.loadShelfBooksSuccess({
                  shelfId,
                  books: [],
                  total: 0,
                  pageIndex,
                })
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
            ? this.bookHttpService.getOpenLibraryCoverImageUrl(
                book.cover_i,
                'L'
              )
            : '',
          blurb: 'No blurb added. TODO!',
          openLibraryId: book.key,
          shelfIds: [shelfId],
        };
        return this.bookHttpService.createBook(payload).pipe(
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
        this.bookHttpService
          .removeBookFromShelf(bookId, shelfId)
          .pipe(
            map(() =>
              LibraryActions.removeBookFromShelfSuccess({ bookId, shelfId })
            )
          )
      )
    )
  );

  deleteBook$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LibraryActions.deleteBook),
      switchMap(({ bookId }) =>
        this.bookHttpService
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
        this.bookHttpService
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
                pageIndex,
              })
            ),
            catchError(error => {
              console.error(
                '[LibraryEffects] searchOpenLibrary failure',
                error
              );
              return of(LibraryActions.searchOpenLibraryFailure());
            })
          )
      )
    )
  );
}
