import { DatePipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { PaginatedListComponent } from '../../common/ui/paginated-list/paginated-list.component';
import { ShelfDetailStore } from './shelf-detail.store';
import { BookSearchStore } from './book-search.store';
import { OpenLibraryBookResponse } from '../../model/response/open-library-book-response.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-shelf-detail-page',
  standalone: true,
  imports: [NgIf, RouterLink, PaginatedListComponent, ReactiveFormsModule, DatePipe],
  templateUrl: './shelf-detail-page.html',
  styleUrl: './shelf-detail-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ShelfDetailStore, BookSearchStore],
})
export class ShelfDetailPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(ShelfDetailStore);
  protected readonly searchStore = inject(BookSearchStore);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly shelfVm = this.store.shelfVm;
  protected readonly booksVm = this.store.booksVm;
  protected readonly searchVm = this.searchStore.vm;

  protected readonly customForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    author: ['', [Validators.required, Validators.maxLength(120)]],
    imageURL: [''],
    blurb: [''],
  });

  protected readonly searchOpen = signal(false);
  protected readonly customOpen = signal(false);
  protected readonly searchInput = this.fb.control('');
  protected readonly searchActionError = signal<string | null>(null);
  protected readonly customActionError = signal<string | null>(null);
  protected readonly searchActionBusy = signal(false);
  protected readonly customActionBusy = signal(false);
  protected readonly searchPitchInput = this.fb.control('');

  constructor() {
    this.route.paramMap
      .pipe(map((params) => params.get('id') ?? ''), takeUntilDestroyed())
      .subscribe((id) => this.store.init(id));

    this.searchInput.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        const query = (value || '').trim();
        if (!query) {
          this.searchStore.search('');
          return;
        }
        void this.searchStore.search(query);
      });
  }

  protected setFilter(value: string): void {
    this.store.setFilter(value);
  }

  protected changePage(direction: 'next' | 'previous'): void {
    this.store.setPage(direction);
  }

  protected changePageSize(size: number): void {
    this.store.setPageSize(size);
  }

  protected removeBook(bookId: string): void {
    void this.store.removeBook(bookId);
  }

  protected openSearch(): void {
    this.searchOpen.set(true);
    this.customOpen.set(false);
    this.searchInput.setValue('');
    this.searchPitchInput.setValue('');
    this.searchActionError.set(null);
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
  }

  protected openCustom(): void {
    this.customOpen.set(true);
    this.searchOpen.set(false);
    this.customForm.reset({ title: '', author: '', imageURL: '', blurb: '' });
    this.customActionError.set(null);
  }

  protected closeCustom(): void {
    this.customOpen.set(false);
  }

  protected async addFromOpenLibrary(book: OpenLibraryBookResponse): Promise<void> {
    this.searchActionError.set(null);
    this.searchActionBusy.set(true);
    try {
      await this.store.addBookFromOpenLibrary(book, this.searchPitchInput.value ?? '');
      this.searchPitchInput.setValue('');
      this.closeSearch();
    } catch (error) {
      console.error(error);
      this.searchActionError.set('Unable to add this book right now.');
    } finally {
      this.searchActionBusy.set(false);
    }
  }

  protected async addCustomBook(): Promise<void> {
    this.customForm.markAllAsTouched();
    if (this.customForm.invalid) {
      return;
    }
    this.customActionError.set(null);
    this.customActionBusy.set(true);
    try {
      await this.store.addCustomBook(this.customForm.getRawValue());
      this.closeCustom();
    } catch (error) {
      console.error(error);
      this.customActionError.set('Unable to add this book right now.');
    } finally {
      this.customActionBusy.set(false);
    }
  }

  protected loadMoreSearch(): void {
    void this.searchStore.loadMore();
  }
}
