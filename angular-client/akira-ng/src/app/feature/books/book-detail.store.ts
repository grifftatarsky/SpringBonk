import { computed, inject, Injectable, signal } from '@angular/core';
import { BookHttpService } from '../../common/http/book-http.service';
import { BookResponse } from '../../model/response/book-response.model';
import { firstValueFrom } from 'rxjs';
import { BookRequest } from '../../model/request/book-request.model';

@Injectable()
export class BookDetailStore {
  private readonly http = inject(BookHttpService);

  private readonly loading = signal(false);
  private readonly error = signal<string | null>(null);
  private readonly book = signal<BookResponse | null>(null);
  private readonly savingPitch = signal(false);
  private readonly saveError = signal<string | null>(null);

  readonly vm = computed(() => ({
    loading: this.loading(),
    error: this.error(),
    book: this.book(),
    savingPitch: this.savingPitch(),
    saveError: this.saveError(),
  }));

  async load(id: string): Promise<void> {
    if (!id) {
      this.error.set('Book not found.');
      this.book.set(null);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const book = await firstValueFrom(this.http.getBookById(id));
      this.book.set(book);
    } catch (error) {
      console.error('[BookDetailStore] Failed to load book', error);
      this.error.set('Unable to load book.');
      this.book.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async updatePitch(blurb: string): Promise<void> {
    const book = this.book();
    if (!book || this.savingPitch()) {
      return;
    }

    this.savingPitch.set(true);
    this.saveError.set(null);

    const request: BookRequest = {
      title: book.title,
      author: book.author,
      imageURL: book.imageURL,
      blurb,
      openLibraryId: book.openLibraryId,
      shelfIds: book.shelves.map((shelf) => shelf.id),
    };

    try {
      const updated = await firstValueFrom(this.http.updateBook(book.id, request));
      this.book.set(updated);
    } catch (error) {
      console.error('[BookDetailStore] Failed to update pitch', error);
      this.saveError.set('Unable to save pitch right now.');
      throw error;
    } finally {
      this.savingPitch.set(false);
    }
  }
}
