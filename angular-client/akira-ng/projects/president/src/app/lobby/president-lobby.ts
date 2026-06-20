import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LobbyService } from './lobby.service';
import {
  cardsPerPlayer,
  LobbyGame,
  MAX_DECKS,
  MAX_PLAYERS,
  MIN_DECKS,
  MIN_PLAYERS,
  suggestedDecks,
} from './lobby.models';

const range = (lo: number, hi: number): number[] =>
  Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/**
 * President lobby, backed by the Decks service: create a game, resume yours, or
 * join an open one. Identity comes from the signed-in session; "Quick play"
 * stays fully local (offline vs bots, no backend/login needed).
 */
@Component({
  selector: 'app-president-lobby',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="mx-auto w-full max-w-3xl px-4 py-10 text-fg">
      <header class="mb-8 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">President 🃏</h1>
          <p class="mt-1 text-sm text-fg-muted">
            Capitalism in the browser — create a table, fill it with friends or bots, and deal.
          </p>
        </div>
        @if (currentUser(); as me) {
          <span class="text-xs text-fg-subtle">Signed in as <strong class="text-fg-muted">{{ me.username }}</strong></span>
        }
      </header>

      <!-- Create a game (requires sign-in) -->
      @if (currentUser()) {
        <section class="rounded-xl border border-rule bg-bg-subtle p-5">
          <h2 class="text-sm font-semibold">Create a game</h2>

          <div class="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <span class="text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">Players</span>
              <div class="mt-1.5 flex flex-wrap gap-1">
                @for (n of playerOptions; track n) {
                  <button type="button"
                          class="grid h-8 w-8 place-items-center rounded-md border text-sm transition-colors"
                          [class.border-accent]="maxPlayers() === n"
                          [class.bg-accent]="maxPlayers() === n"
                          [class.text-accent-fg]="maxPlayers() === n"
                          [class.border-rule]="maxPlayers() !== n"
                          [class.text-fg]="maxPlayers() !== n"
                          (click)="maxPlayers.set(n)">{{ n }}</button>
                }
              </div>
            </div>

            <div>
              <span class="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
                Decks
                <span class="group relative inline-flex">
                  <button type="button"
                          class="grid size-4 place-items-center rounded-full border border-rule text-[0.6rem] text-fg-muted"
                          aria-label="About deck count">?</button>
                  <span role="tooltip"
                        class="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-md border border-rule bg-bg p-2.5 text-[0.72rem] font-normal normal-case leading-relaxed tracking-normal text-fg-muted opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    More decks shuffle in duplicate cards, so pairs, triples and quads come up far
                    more often — bigger sets and deeper play. Fewer decks make every card scarcer.
                  </span>
                </span>
              </span>
              <div class="mt-1.5 flex flex-wrap gap-1">
                @for (d of deckOptions; track d) {
                  <button type="button"
                          class="grid h-8 w-8 place-items-center rounded-md border text-sm transition-colors"
                          [class.border-accent]="decks() === d"
                          [class.bg-accent]="decks() === d"
                          [class.text-accent-fg]="decks() === d"
                          [class.border-rule]="decks() !== d"
                          [class.text-fg]="decks() !== d"
                          (click)="decks.set(d)">{{ d }}</button>
                }
              </div>
              <p class="mt-1.5 text-xs text-fg-subtle">
                Suggested <strong class="text-fg-muted">{{ suggested() }}</strong> ·
                ~{{ perPlayer() }} cards each
              </p>
            </div>
          </div>

          <div class="mt-5 flex flex-wrap items-center gap-2">
            <button type="button"
                    class="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover disabled:opacity-40"
                    [disabled]="busy()" (click)="create()">Create game</button>
            <button type="button"
                    class="rounded-md border border-rule px-4 py-2 text-sm font-semibold text-fg transition hover:border-rule-strong"
                    (click)="quickPlay()">Quick play vs bots</button>
          </div>
        </section>
      } @else if (lobby.authChecked()) {
        <section class="rounded-xl border border-rule bg-bg-subtle p-5">
          <p class="text-sm text-fg-muted">Sign in to create or join games with others.</p>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <a routerLink="/login"
               class="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover">Sign in</a>
            <button type="button"
                    class="rounded-md border border-rule px-4 py-2 text-sm font-semibold text-fg transition hover:border-rule-strong"
                    (click)="quickPlay()">Quick play vs bots</button>
          </div>
        </section>
      }

      <!-- My games -->
      @if (myGames().length) {
        <section class="mt-8">
          <h2 class="text-sm font-semibold">Your games</h2>
          <ul class="mt-3 grid gap-2">
            @for (g of myGames(); track g.id) {
              <li class="flex items-center justify-between gap-3 rounded-lg border border-rule bg-bg-subtle px-4 py-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ g.host }}’s table</p>
                  <p class="text-xs text-fg-subtle">{{ summary(g) }}</p>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <button type="button"
                          class="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg hover:bg-accent-hover"
                          (click)="resume(g)">{{ g.status === 'active' ? 'Enter' : 'Open' }}</button>
                  @if (g.ownerId === currentUser()?.id) {
                    <button type="button"
                            class="rounded-md border border-rule px-3 py-1.5 text-xs font-medium text-fg-muted hover:text-fg"
                            (click)="close(g)">Close</button>
                  }
                </div>
              </li>
            }
          </ul>
        </section>
      }

      <!-- Open games -->
      <section class="mt-8">
        <h2 class="text-sm font-semibold">Find a game</h2>
        @if (openGames().length) {
          <ul class="mt-3 grid gap-2">
            @for (g of openGames(); track g.id) {
              <li class="flex items-center justify-between gap-3 rounded-lg border border-rule bg-bg-subtle px-4 py-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ g.host }}’s table</p>
                  <p class="text-xs text-fg-subtle">{{ summary(g) }}</p>
                </div>
                <button type="button"
                        class="shrink-0 rounded-md border border-rule px-3 py-1.5 text-xs font-semibold text-fg transition hover:border-rule-strong disabled:opacity-40"
                        [disabled]="!currentUser() || busy()" (click)="join(g)">Join</button>
              </li>
            }
          </ul>
        } @else {
          <p class="mt-3 text-sm text-fg-muted">No open games right now.</p>
        }
      </section>
    </div>
  `,
})
export class PresidentLobby {
  protected readonly lobby = inject(LobbyService);
  private readonly router = inject(Router);

  protected readonly currentUser = this.lobby.currentUser;
  protected readonly openGames = this.lobby.openGames;
  protected readonly myGames = this.lobby.myGames;
  protected readonly maxPlayers = signal(4);
  protected readonly decks = signal(suggestedDecks(4));
  protected readonly busy = signal(false);

  protected readonly playerOptions = range(MIN_PLAYERS, MAX_PLAYERS);
  protected readonly deckOptions = range(MIN_DECKS, MAX_DECKS);
  protected readonly suggested = computed(() => suggestedDecks(this.maxPlayers()));
  protected readonly perPlayer = computed(() => cardsPerPlayer(this.maxPlayers(), this.decks()));

  constructor() {
    void this.refresh();
  }

  private async refresh(): Promise<void> {
    await this.lobby.loadMe();
    await Promise.all([this.lobby.loadOpen(), this.lobby.loadMine()]);
  }

  protected summary(g: LobbyGame): string {
    const filled = g.seats.filter((s) => s.kind !== 'empty').length;
    const decks = `${g.decks} deck${g.decks === 1 ? '' : 's'}`;
    const status = g.status === 'active' ? ' · in progress' : '';
    return `${filled}/${g.maxPlayers} seats · ${decks}${status}`;
  }

  protected async create(): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      const game = await this.lobby.createGame(this.maxPlayers(), this.decks());
      await this.router.navigate(['/games/president/room', game.id]);
    } finally {
      this.busy.set(false);
    }
  }

  protected quickPlay(): void {
    void this.router.navigate(['/games/president/play', 'local']);
  }

  protected async join(g: LobbyGame): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      await this.lobby.joinGame(g.id);
      await this.router.navigate(['/games/president/room', g.id]);
    } finally {
      this.busy.set(false);
    }
  }

  protected resume(g: LobbyGame): void {
    const path = g.status === 'active' ? '/games/president/play' : '/games/president/room';
    void this.router.navigate([path, g.id]);
  }

  protected async close(g: LobbyGame): Promise<void> {
    await this.lobby.closeGame(g.id);
    await this.lobby.loadMine();
  }
}
