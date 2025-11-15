import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { BookDetailStore } from './book-detail.store';

@Component({
  selector: 'app-book-detail-page',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink],
  providers: [BookDetailStore],
  templateUrl: './book-detail-page.html',
  styleUrl: './book-detail-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookDetailPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(BookDetailStore);
  protected readonly vm = this.store.vm;

  constructor() {
    this.route.paramMap
      .pipe(map((params) => params.get('id') ?? ''))
      .subscribe((id) => this.store.load(id));
  }
}
