import { computed, inject, Injectable, signal } from '@angular/core';
import { BookHttpService } from '../../common/http/book-http.service';
import { BookResponse } from '../../model/response/book-response.model';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class BookDetailStore {
  private readonly http = inject(BookHttpService);

  private readonly loading = signal(false);
  private readonly error = signal<string | null>(null);
  private readonly book = signal<BookResponse | null>(null);

  readonly vm = computed(() => ({
    loading: this.loading(),
    error: this.error(),
    book: this.book(),
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
}
