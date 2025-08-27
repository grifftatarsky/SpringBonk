import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { Store } from '@ngrx/store';
import { BehaviorSubject, combineLatest, Subject, takeUntil } from 'rxjs';
import * as ElectionsActions from '../store/elections.actions';
import {
  selectCandidates,
  selectRunning,
  selectRunResult,
} from '../store/elections.selectors';
import { EliminationMessage } from '../../model/type/elimination-message.enum';

export interface ElectionRunSheetData {
  electionId: string;
}

@Component({
  selector: 'app-election-run-sheet',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="sheet-root">
      <div class="sheet-header">
        <mat-icon>terminal</mat-icon>
        <span>Election Runner</span>
        <span class="spacer"></span>
        <button mat-icon-button (click)="close()" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <mat-divider></mat-divider>

      <div class="terminal-wrapper">
        <div class="scanlines"></div>
        @if (running$ | async) {
          <div class="running-row">
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
            <span>Crunching rounds…</span>
          </div>
        }
        <pre class="terminal" [innerText]="typedText$ | async"></pre>
        <div
          class="cursor"
          [class.hidden]="!runningDone && !typedStarted"></div>
        @if (finished && winnerName) {
          <div class="winner-banner">Winner: {{ winnerName }}</div>
        }
      </div>

      <div class="actions">
        <span class="spacer"></span>
        <button mat-flat-button color="accent" (click)="close()">Done</button>
      </div>
    </div>
  `,
  styles: [
    `
      .sheet-root {
        padding: 12px;
      }
      .sheet-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
      }
      .spacer {
        flex: 1;
      }
      .terminal-wrapper {
        position: relative;
        background: #001a00;
        border: 1px solid #00ff41;
        padding: 12px;
        border-radius: 4px;
        min-height: 220px;
        overflow: hidden;
      }
      .terminal {
        margin: 0;
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          'Liberation Mono', 'Courier New', monospace;
        color: #00ff41;
        white-space: pre-wrap;
        position: relative;
        z-index: 1;
      }
      .cursor {
        position: absolute;
        width: 8px;
        height: 16px;
        background: #00ff41;
        right: 12px;
        bottom: 12px;
        animation: blink 1s step-start infinite;
        z-index: 6;
      }
      .cursor.hidden {
        opacity: 0;
      }
      @keyframes blink {
        50% {
          opacity: 0;
        }
      }
      .running-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      .actions {
        display: flex;
        align-items: center;
        margin-top: 12px;
      }
      .scanlines {
        position: absolute;
        inset: 0;
        z-index: 2;
        pointer-events: none;
        background: repeating-linear-gradient(
          to bottom,
          rgba(0, 255, 65, 0.04) 0,
          rgba(0, 255, 65, 0.04) 1px,
          transparent 3px,
          transparent 4px
        );
        animation: scan 7s linear infinite;
      }
      @keyframes scan {
        from {
          background-position-y: 0;
        }
        to {
          background-position-y: 100%;
        }
      }
      .winner-banner {
        position: absolute;
        left: 50%;
        bottom: 12px;
        transform: translateX(-50%);
        color: #001a00;
        background: #00ff41;
        border: 1px solid #00ff41;
        padding: 4px 10px;
        border-radius: 3px;
        font-weight: 700;
        letter-spacing: 0.5px;
        z-index: 7;
        animation: pulse 800ms ease-in-out 2;
      }
      @keyframes pulse {
        0% {
          transform: translateX(-50%) scale(0.9);
          box-shadow: 0 0 0 rgba(0, 255, 65, 0.7);
        }
        60% {
          transform: translateX(-50%) scale(1.06);
          box-shadow: 0 0 18px rgba(0, 255, 65, 0.4);
        }
        100% {
          transform: translateX(-50%) scale(1);
          box-shadow: 0 0 0 rgba(0, 255, 65, 0);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionRunSheetComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  running$ = this.store.select(selectRunning);
  typedText$ = new BehaviorSubject<string>('');
  private destroy$ = new Subject<void>();
  private fullScript: string[] = [];
  private typingTimer: any;
  finished = false;
  typedStarted = false;
  runningDone = false;
  winnerName: string | null = null;

  constructor(
    private ref: MatBottomSheetRef<ElectionRunSheetComponent>,
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: ElectionRunSheetData
  ) {}

  ngOnInit(): void {
    // Start fresh
    this.typedText$.next('');
    this.finished = false;
    this.typedStarted = false;
    this.runningDone = false;
    console.log('[ElectionRunSheet] Starting run for', this.data.electionId);
    this.store.dispatch(
      ElectionsActions.runElection({ electionId: this.data.electionId })
    );

    combineLatest([
      this.store.select(selectRunResult),
      this.store.select(selectCandidates),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([res, candidates]) => {
        if (!res) return;
        // Build pretty script once
        const nameOf = (id: string) =>
          candidates.find(c => c.id === id)?.base.title || id;
        const lines: string[] = [];
        for (const round of res.rounds) {
          const title = `==== Round ${round.roundNumber} ====`;
          lines.push(title);
          const entries = Object.entries(round.votes || {}).sort(
            (a, b) => b[1] - a[1]
          );
          for (const [cid, count] of entries) {
            const nm = nameOf(cid);
            const pad = '.'.repeat(Math.max(2, 40 - nm.length));
            lines.push(`${nm} ${pad} ${count}`);
          }
          switch (round.eliminationMessage) {
            case EliminationMessage.WINNER_MAJORITY:
              lines.push('> Winner by majority');
              break;
            case EliminationMessage.WINNER_ATTRITION:
              lines.push('> Winner by attrition');
              break;
            case EliminationMessage.TIE_ALL_WAY_TIE_ELIMINATION_MESSAGE:
              lines.push('> All-way tie correction round (no eliminations)');
              break;
            case EliminationMessage.TIE_ELIMINATION_MESSAGE:
              lines.push('> Tie: eliminating lowest tied candidates');
              break;
            case EliminationMessage.NO_TIE_ELIMINATION_MESSAGE:
              lines.push('> Eliminating lowest candidate');
              break;
          }
          if (round.eliminatedCandidateIds?.length) {
            lines.push(
              `> Eliminated: ${round.eliminatedCandidateIds.map(nameOf).join(', ')}`
            );
          }
          lines.push('');
        }
        const win = nameOf(res.winnerId);
        lines.push(`==== Winner ====`);
        lines.push(`${win}`);
        lines.push('');

        this.fullScript = lines;
        this.winnerName = win;
        this.runningDone = true;
        this.startTyping();
      });
  }

  private startTyping(): void {
    if (!this.fullScript.length) return;
    this.typedStarted = true;
    const text = this.fullScript.join('\n');
    let i = 0;
    const total = text.length;
    const step = () => {
      if (i >= total) {
        this.finished = true;
        return;
      }
      const chunk = text[i];
      this.typedText$.next(this.typedText$.value + chunk);
      i++;
      const delay = chunk === '\n' ? 80 : 14; // classic terminal pacing
      this.typingTimer = setTimeout(step, delay);
    };
    step();
  }

  close(): void {
    clearTimeout(this.typingTimer);
    this.ref.dismiss();
  }

  ngOnDestroy(): void {
    clearTimeout(this.typingTimer);
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Confetti removed per request.
}
