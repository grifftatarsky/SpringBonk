import { ChangeDetectionStrategy, Component, Inject, OnDestroy, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Subject, combineLatest, takeUntil } from 'rxjs';
import * as ElectionsActions from '../store/elections.actions';
import { selectCandidates, selectRunResult, selectRunning } from '../store/elections.selectors';
import { CandidateResponse } from '../../model/response/candidate-response.model';
import { EliminationMessage } from '../../model/type/elimination-message.enum';

export interface ElectionRunSheetData {
  electionId: string;
}

@Component({
  selector: 'app-election-run-sheet',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDividerModule, MatProgressBarModule],
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
        @if (running$ | async) {
          <div class="running-row">
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
            <span>Crunching rounds…</span>
          </div>
        }
        <pre class="terminal" [innerText]="typedText$ | async"></pre>
        <div class="cursor" [class.hidden]="!(runningDone) && !(typedStarted)"></div>
        <div class="confetti" #confetti></div>
      </div>

      <div class="actions">
        <button mat-stroked-button color="primary" (click)="replay()" [disabled]="!finished">Replay</button>
        <span class="spacer"></span>
        <button mat-flat-button color="accent" (click)="close()">Done</button>
      </div>
    </div>
  `,
  styles: [
    `
      .sheet-root { padding: 12px; }
      .sheet-header { display: flex; align-items: center; gap: 8px; font-weight: 600; }
      .spacer { flex: 1; }
      .terminal-wrapper { position: relative; background: #001a00; border: 1px solid #00ff41; padding: 12px; border-radius: 4px; min-height: 220px; }
      .terminal { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; color: #00ff41; white-space: pre-wrap; }
      .cursor { position: absolute; width: 8px; height: 16px; background: #00ff41; right: 12px; bottom: 12px; animation: blink 1s step-start infinite; }
      .cursor.hidden { opacity: 0; }
      @keyframes blink { 50% { opacity: 0; } }
      .running-row { display:flex; align-items:center; gap:8px; margin-bottom: 8px; }
      .confetti { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
      .confetti-piece { position: absolute; width: 6px; height: 6px; background: #00ff41; opacity: 0.9; will-change: transform, opacity; }
      .actions { display: flex; align-items: center; margin-top: 12px; }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectionRunSheetComponent implements OnInit, OnDestroy {
  @ViewChild('confetti', { static: false }) confettiRef?: ElementRef<HTMLDivElement>;
  private readonly store = inject(Store);
  running$ = this.store.select(selectRunning);
  typedText$ = new BehaviorSubject<string>('');
  private destroy$ = new Subject<void>();
  private fullScript: string[] = [];
  private typingTimer: any;
  finished = false;
  typedStarted = false;
  runningDone = false;

  constructor(
    private ref: MatBottomSheetRef<ElectionRunSheetComponent>,
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: ElectionRunSheetData,
  ) {}

  ngOnInit(): void {
    // Start fresh
    this.typedText$.next('');
    this.finished = false;
    this.typedStarted = false;
    this.runningDone = false;
    console.log('[ElectionRunSheet] Starting run for', this.data.electionId);
    this.store.dispatch(ElectionsActions.runElection({ electionId: this.data.electionId }));

    combineLatest([this.store.select(selectRunResult), this.store.select(selectCandidates)])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([res, candidates]) => {
        if (!res) return;
        // Build pretty script once
        const nameOf = (id: string) => candidates.find(c => c.id === id)?.base.title || id;
        const lines: string[] = [];
        for (const round of res.rounds) {
          const title = `==== Round ${round.roundNumber} ====`;
          lines.push(title);
          const entries = Object.entries(round.votes || {}).sort((a, b) => b[1] - a[1]);
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
            lines.push(`> Eliminated: ${round.eliminatedCandidateIds.map(nameOf).join(', ')}`);
          }
          lines.push('');
        }
        const winnerName = nameOf(res.winnerId);
        lines.push(`==== Winner ====`);
        lines.push(`${winnerName}`);
        lines.push('');

        this.fullScript = lines;
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
        this.triggerConfetti();
        return;
      }
      const chunk = text[i];
      this.typedText$.next(this.typedText$.value + chunk);
      i++;
      const delay = chunk === '\n' ? 80 : 14; // slightly pause at line breaks
      this.typingTimer = setTimeout(step, delay);
    };
    step();
  }

  replay(): void {
    if (!this.fullScript.length) return;
    clearTimeout(this.typingTimer);
    this.typedText$.next('');
    this.finished = false;
    this.typedStarted = false;
    this.startTyping();
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

  private triggerConfetti(): void {
    // Create a simple pixelated green confetti burst
    const container = this.confettiRef?.nativeElement;
    if (!container) return;
    const pieces = 60;
    for (let i = 0; i < pieces; i++) {
      const span = document.createElement('span');
      span.className = 'confetti-piece';
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 140;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      span.style.left = '50%';
      span.style.top = '70%';
      span.style.transform = `translate(-50%, -50%) translate(0px, 0px) rotate(0deg)`;
      span.style.transition = `transform 700ms cubic-bezier(.2,.5,.2,1), opacity 900ms ease-out`;
      container.appendChild(span);
      requestAnimationFrame(() => {
        span.style.transform = `translate(-50%, -50%) translate(${tx}px, ${ty}px) rotate(${(Math.random()*360)|0}deg)`;
      });
      // Stagger opacity fade
      setTimeout(() => (span.style.opacity = '0'), 400 + Math.random() * 400);
      // Remove later
      setTimeout(() => span.remove(), 1200);
    }
  }
}
