import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import {
  DynamicDialogConfig,
  DynamicDialogRef,
  DynamicDialogModule,
} from 'primeng/dynamicdialog';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { selectRunning, selectRunResult } from '../../store/selector/elections.selectors';
import * as ElectionsActions from '../../store/action/elections.actions';
import { ElectionResult } from '../../model/election-result.model';
import { AsyncPipe, DatePipe } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-election-run-dialog',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    DatePipe,
    ButtonModule,
    ProgressSpinnerModule,
    DynamicDialogModule,
  ],
  templateUrl: './election-run-dialog.component.html',
  styleUrls: ['./election-run-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionRunDialogComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref = inject(DynamicDialogRef<void>);
  private readonly config = inject(DynamicDialogConfig<{ electionId: string }>);

  readonly running$ = this.store.select(selectRunning);
  readonly result$ = this.store.select(selectRunResult);

  ngOnInit(): void {
    const electionId = this.config.data?.electionId;
    if (electionId) {
      this.store.dispatch(ElectionsActions.runElection({ electionId }));
    }

    this.result$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((result): result is ElectionResult => !!result)
      )
      .subscribe(() => {
        setTimeout(() => this.ref.close(), 1200);
      });
  }

  close(): void {
    this.ref.close();
  }
}
