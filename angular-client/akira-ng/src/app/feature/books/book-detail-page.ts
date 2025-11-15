import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { BookDetailStore } from './book-detail.store';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-book-detail-page',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink, ReactiveFormsModule],
  providers: [BookDetailStore],
  templateUrl: './book-detail-page.html',
  styleUrl: './book-detail-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookDetailPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(BookDetailStore);
  protected readonly vm = this.store.vm;
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly pitchForm = this.fb.group({ blurb: ['', [Validators.maxLength(1000)]] });

  constructor() {
    this.route.paramMap
      .pipe(map((params) => params.get('id') ?? ''), takeUntilDestroyed())
      .subscribe((id) => this.store.load(id));

    effect(() => {
      const book = this.vm().book;
      if (!book) {
        this.pitchForm.patchValue({ blurb: '' }, { emitEvent: false });
        return;
      }
      this.pitchForm.patchValue({ blurb: book.blurb || '' }, { emitEvent: false });
    });
  }

  protected resetPitch(): void {
    const book = this.vm().book;
    this.pitchForm.reset({ blurb: book?.blurb || '' });
  }

  protected async savePitch(): Promise<void> {
    this.pitchForm.markAllAsTouched();
    if (this.pitchForm.invalid || this.vm().savingPitch) {
      return;
    }
    const value = this.pitchForm.controls.blurb.value?.trim() ?? '';
    await this.store.updatePitch(value);
  }
}
