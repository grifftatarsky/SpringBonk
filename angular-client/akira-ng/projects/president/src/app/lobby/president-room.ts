import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LobbyService } from './lobby.service';
import { cardsPerPlayer, LobbyGame, Seat } from './lobby.models';

/**
 * A game's waiting room against the Decks backend: fill seats with bots, ready
 * up, and (host) start or close. Polls for live seat/ready changes until the
 * STOMP channel replaces it. Starting navigates to the table.
 */
@Component({
  selector: 'app-president-room',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="mx-auto w-full max-w-2xl px-4 py-10 text-fg">
      <a routerLink="/games/president" class="text-sm text-fg-muted hover:text-fg">← Lobby</a>

      @if (game(); as g) {
        <header class="mt-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 class="text-xl font-semibold tracking-tight">{{ g.host }}’s table</h1>
            <p class="mt-1 text-sm text-fg-muted">
              {{ g.maxPlayers }} seats · {{ g.decks }} deck{{ g.decks === 1 ? '' : 's' }} ·
              ~{{ perPlayer(g) }} cards each
            </p>
          </div>
          <span class="rounded-full border border-rule px-2.5 py-1 text-xs font-medium capitalize text-fg-muted">
            {{ g.status }}
          </span>
        </header>

        @if (g.status === 'active') {
          <div class="mt-6 rounded-xl border border-rule bg-bg-subtle p-5 text-center">
            <p class="text-sm text-fg-muted">This game is in progress.</p>
            <button type="button"
                    class="mt-3 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
                    (click)="enter()">Enter game</button>
          </div>
        } @else {
          <ul class="mt-6 grid gap-2">
            @for (seat of g.seats; track seat.index) {
              <li class="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 bg-bg-subtle"
                  [class.border-accent]="isMe(seat)"
                  [class.border-rule]="!isMe(seat)">
                <div class="flex min-w-0 items-center gap-2.5">
                  <span class="grid size-7 shrink-0 place-items-center rounded-full border border-rule text-xs text-fg-muted">
                    {{ seat.index + 1 }}
                  </span>
                  @if (seat.kind === 'empty') {
                    <span class="text-sm text-fg-subtle">Empty seat</span>
                  } @else {
                    <span class="truncate text-sm font-medium">{{ isMe(seat) ? 'You' : seat.name }}</span>
                    @if (seat.kind === 'host') {
                      <span class="rounded bg-bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-fg-muted">Host</span>
                    } @else if (seat.kind === 'bot') {
                      <span class="rounded bg-bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-fg-muted">Bot</span>
                    }
                  }
                </div>

                <div class="flex shrink-0 items-center gap-2">
                  @if (seat.kind === 'empty') {
                    @if (isHost()) {
                      <button type="button"
                              class="rounded-md border border-rule px-2.5 py-1 text-xs font-medium text-fg-muted hover:text-fg"
                              (click)="addBot(seat)">Add bot</button>
                    } @else {
                      <span class="text-xs text-fg-subtle">Open</span>
                    }
                  } @else if (isMe(seat)) {
                    <button type="button"
                            class="rounded-md px-2.5 py-1 text-xs font-semibold"
                            [class.bg-success]="seat.ready"
                            [class.text-success-fg]="seat.ready"
                            [class.border]="!seat.ready"
                            [class.border-rule]="!seat.ready"
                            [class.text-fg-muted]="!seat.ready"
                            (click)="toggleReady(seat)">
                      {{ seat.ready ? 'Ready ✓' : 'Ready up' }}
                    </button>
                  } @else {
                    <span class="text-xs" [class.text-success]="seat.ready" [class.text-fg-subtle]="!seat.ready">
                      {{ seat.ready ? 'Ready' : 'Not ready' }}
                    </span>
                    @if (isHost() && seat.kind !== 'host') {
                      <button type="button"
                              class="rounded-md border border-rule px-2 py-1 text-xs text-fg-subtle hover:text-fg"
                              (click)="remove(seat)" aria-label="Remove">✕</button>
                    }
                  }
                </div>
              </li>
            }
          </ul>

          <div class="mt-5 flex flex-wrap items-center gap-2">
            @if (isHost() && hasEmpty(g)) {
              <button type="button"
                      class="rounded-md border border-rule px-3 py-2 text-sm font-medium text-fg transition hover:border-rule-strong"
                      (click)="fillBots()">Fill with bots</button>
            }
            @if (!isSeated(g) && hasEmpty(g)) {
              <button type="button"
                      class="rounded-md border border-rule px-3 py-2 text-sm font-medium text-fg transition hover:border-rule-strong"
                      (click)="sit()">Take a seat</button>
            }
            @if (isHost()) {
              <button type="button"
                      class="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover disabled:opacity-40"
                      [disabled]="!canStart(g)" (click)="start()">Start game</button>
              <button type="button"
                      class="rounded-md border border-rule px-3 py-2 text-sm font-medium text-fg-muted transition hover:text-fg"
                      (click)="close()">Close game</button>
              @if (!canStart(g)) {
                <span class="text-xs text-fg-subtle">All seats must be filled and ready.</span>
              }
            } @else {
              <span class="text-xs text-fg-subtle">Waiting for {{ g.host }} to start…</span>
            }
          </div>
        }
      } @else {
        <div class="mt-10 text-center">
          <p class="text-sm text-fg-muted">That game isn’t available.</p>
          <a routerLink="/games/president"
             class="mt-3 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover">
            Back to lobby
          </a>
        </div>
      }
    </div>
  `,
})
export class PresidentRoom {
  private readonly lobby = inject(LobbyService);
  private readonly router = inject(Router);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly game = signal<LobbyGame | null>(null);

  constructor() {
    void this.init();
    // Poll for other players joining / readying up until STOMP replaces this.
    const timer = setInterval(() => {
      if (this.game()?.status === 'waiting') {
        void this.reload();
      }
    }, 3000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  private async init(): Promise<void> {
    if (!this.lobby.currentUser()) {
      await this.lobby.loadMe();
    }
    await this.reload();
  }

  private async reload(): Promise<void> {
    try {
      this.game.set(await this.lobby.getGame(this.id));
    } catch {
      this.game.set(null);
    }
  }

  protected isHost(): boolean {
    const me = this.lobby.currentUser();
    return !!me && this.game()?.ownerId === me.id;
  }

  protected isMe(seat: Seat): boolean {
    const me = this.lobby.currentUser();
    return !!me && seat.userId === me.id;
  }

  protected isSeated(g: LobbyGame): boolean {
    return g.seats.some((s) => this.isMe(s));
  }

  protected hasEmpty(g: LobbyGame): boolean {
    return g.seats.some((s) => s.kind === 'empty');
  }

  protected canStart(g: LobbyGame): boolean {
    return this.lobby.canStart(g);
  }

  protected perPlayer(g: LobbyGame): number {
    return cardsPerPlayer(g.maxPlayers, g.decks);
  }

  protected async addBot(seat: Seat): Promise<void> {
    this.game.set(await this.lobby.addBot(this.id, seat.index));
  }

  protected async fillBots(): Promise<void> {
    this.game.set(await this.lobby.fillWithBots(this.id));
  }

  protected async sit(): Promise<void> {
    this.game.set(await this.lobby.joinGame(this.id));
  }

  protected async remove(seat: Seat): Promise<void> {
    this.game.set(await this.lobby.clearSeat(this.id, seat.index));
  }

  protected async toggleReady(seat: Seat): Promise<void> {
    this.game.set(await this.lobby.setReady(this.id, !seat.ready));
  }

  protected async start(): Promise<void> {
    await this.lobby.startGame(this.id);
    await this.router.navigate(['/games/president/play', this.id]);
  }

  protected enter(): void {
    void this.router.navigate(['/games/president/play', this.id]);
  }

  protected async close(): Promise<void> {
    await this.lobby.closeGame(this.id);
    await this.router.navigate(['/games/president']);
  }
}
