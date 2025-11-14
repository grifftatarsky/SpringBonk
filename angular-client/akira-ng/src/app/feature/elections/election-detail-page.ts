import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-election-detail-page',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './election-detail-page.html',
  styleUrl: './election-detail-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionDetailPage {
  private readonly route = inject(ActivatedRoute);
  readonly electionId$ = this.route.paramMap.pipe(map((params) => params.get('id')));
}
