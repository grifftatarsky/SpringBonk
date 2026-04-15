import { DatePipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { PaginatedListComponent } from '../../common/ui/paginated-list/paginated-list.component';
import { ShelfDetailStore } from './shelf-detail.store';
import { BookSearchStore } from './book-search.store';
import { OpenLibraryBookResponse } from '../../model/response/open-library-book-response.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type AddBookTab = 'search' | 'custom';

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
  private readonly router = inject(Router);
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

  // Single unified add-book dialog with two tabs: search Open Library OR custom entry.
  protected readonly addDialogOpen = signal(false);
  protected readonly addDialogTab = signal<AddBookTab>('search');

  protected readonly searchInput = this.fb.control('');
  protected readonly searchPitchInput = this.fb.control('');
  protected readonly searchActionError = signal<string | null>(null);
  protected readonly customActionError = signal<string | null>(null);
  protected readonly searchActionBusy = signal(false);
  protected readonly customActionBusy = signal(false);

  // Shelf management (⋮ menu + confirm modals).
  protected readonly shelfMenuOpen = signal(false);
  protected readonly deleteShelfConfirmOpen = signal(false);
  protected readonly deleteShelfBusy = signal(false);

  // Remove-book confirm modal (per-book).
  protected readonly removeBookConfirmId = signal<string | null>(null);
  protected readonly removeBookConfirmTitle = signal<string>('');
  protected readonly removeBookBusy = signal(false);

  constructor() {
    this.route.paramMap
      .pipe(map((params) => params.get('id') ?? ''), takeUntilDestroyed())
      .subscribe((id) => this.store.init(id));

    // The store debounces internally (500ms), so we can push every
    // keystroke without hammering Open Library.
    this.searchInput.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        this.searchStore.setQuery(value || '');
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

  protected askRemoveBook(bookId: string, bookTitle: string): void {
    this.removeBookConfirmId.set(bookId);
    this.removeBookConfirmTitle.set(bookTitle);
    this.shelfMenuOpen.set(false);
  }

  protected cancelRemoveBook(): void {
    this.removeBookConfirmId.set(null);
    this.removeBookConfirmTitle.set('');
  }

  protected async confirmRemoveBook(): Promise<void> {
    const id = this.removeBookConfirmId();
    if (!id || this.removeBookBusy()) return;
    this.removeBookBusy.set(true);
    try {
      await this.store.removeBook(id);
      this.cancelRemoveBook();
    } finally {
      this.removeBookBusy.set(false);
    }
  }

  // Shelf menu + delete flow.
  protected toggleShelfMenu(): void {
    this.shelfMenuOpen.update((open) => !open);
  }

  protected closeShelfMenu(): void {
    this.shelfMenuOpen.set(false);
  }

  protected askDeleteShelf(): void {
    this.deleteShelfConfirmOpen.set(true);
    this.shelfMenuOpen.set(false);
  }

  protected cancelDeleteShelf(): void {
    this.deleteShelfConfirmOpen.set(false);
  }

  protected async confirmDeleteShelf(): Promise<void> {
    if (this.deleteShelfBusy()) return;
    this.deleteShelfBusy.set(true);
    try {
      const ok = await this.store.deleteShelf();
      this.deleteShelfConfirmOpen.set(false);
      if (ok) {
        await this.router.navigate(['/shelves']);
      }
    } finally {
      this.deleteShelfBusy.set(false);
    }
  }

  protected openAddDialog(tab: AddBookTab = 'search'): void {
    this.addDialogTab.set(tab);
    this.addDialogOpen.set(true);
    this.searchInput.setValue('');
    this.searchPitchInput.setValue('');
    this.customForm.reset({ title: '', author: '', imageURL: '', blurb: '' });
    this.searchActionError.set(null);
    this.customActionError.set(null);
  }

  protected closeAddDialog(): void {
    this.addDialogOpen.set(false);
  }

  protected setAddDialogTab(tab: AddBookTab): void {
    this.addDialogTab.set(tab);
  }

  protected async addFromOpenLibrary(book: OpenLibraryBookResponse): Promise<void> {
    this.searchActionError.set(null);
    this.searchActionBusy.set(true);
    try {
      await this.store.addBookFromOpenLibrary(book, this.searchPitchInput.value ?? '');
      this.searchPitchInput.setValue('');
      this.closeAddDialog();
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
      this.closeAddDialog();
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

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (this.addDialogOpen()) {
      this.closeAddDialog();
      return;
    }
    if (this.deleteShelfConfirmOpen()) {
      this.cancelDeleteShelf();
      return;
    }
    if (this.removeBookConfirmId()) {
      this.cancelRemoveBook();
      return;
    }
    if (this.shelfMenuOpen()) {
      this.closeShelfMenu();
    }
  }
}
