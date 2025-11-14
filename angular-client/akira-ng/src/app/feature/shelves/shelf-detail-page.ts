import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-shelf-detail-page',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './shelf-detail-page.html',
  styleUrl: './shelf-detail-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfDetailPage {
  private readonly route = inject(ActivatedRoute);

  readonly shelfId$ = this.route.paramMap.pipe(
    map((params) => params.get('id')),
  );
}
