import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CardRenderer } from '../render/card-renderer';
import { CardTheme } from '../render/card-atlas';
import { Role } from '../game/state';
import { LobbyGame } from '../lobby/lobby.models';
import { LobbyService } from '../lobby/lobby.service';
import { Announcement, PlayerSlot, PresidentGame } from './president-game';
import { GameSocket } from './game-socket';
import { hitTest, layoutTable, PickRect } from './layout';
import { Animator } from './animator';
import { RulesDialog } from './rules-dialog';

type Status = 'init' | 'ready' | 'unsupported' | 'offline';

/** Thrown when a game we should join live can't be reached (vs. an offline game). */
class LiveConnectError extends Error {
  constructor(
    message: string,
    readonly reason: unknown,
  ) {
    super(message);
  }
}

const SLOTS: readonly PlayerSlot[] = [
  { id: 'you', label: 'You', isHuman: true },
  { id: 'west', label: 'West', isHuman: false },
  { id: 'north', label: 'North', isHuman: false },
  { id: 'east', label: 'East', isHuman: false },
];

const ROLE_LABEL: Readonly<Record<Role, string>> = {
  president: 'President',
  'vice-president': 'Vice-President',
  citizen: 'Citizen',
  'vice-asshole': 'Vice-Asshole',
  asshole: 'Asshole',
};

/**
 * The President card table: a WebGPU canvas driven by {@link PresidentGame}.
 * Renders the live game state every frame, turns clicks into card selection via
 * the layout's hit rects, and offers Play/Pass controls plus round results.
 */
@Component({
  selector: 'app-president-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RulesDialog, RouterLink],
  templateUrl: './president-table.html',
  styleUrl: './president-table.css',
})
export class PresidentTable {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('cv');
  private readonly route = inject(ActivatedRoute);
  private readonly lobby = inject(LobbyService);
  private readonly http = inject(HttpClient);
  protected readonly status = signal<Status>('init');
  protected readonly rulesOpen = signal(false);
  protected readonly game = signal<PresidentGame | null>(null);
  protected readonly selected = signal<ReadonlySet<string>>(new Set());
  protected readonly sidebarOpen = signal(true);
  /** Why a live game couldn't be joined (shown on the 'offline' panel). */
  protected readonly liveError = signal<string>('');
  private readonly lastLobbyGame = signal<LobbyGame | null>(null);

  /** Transient on-table banner ("West takes the trick", "…— President!"). */
  protected readonly banner = signal<{ text: string; kind: string } | null>(null);

  private renderer: CardRenderer | null = null;
  private themeObserver: MutationObserver | null = null;
  private readonly animator = new Animator();
  private handPicks: PickRect[] = [];
  private hoveredUid: string | null = null;
  private lastTime = 0;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;
  private bannerQueue: Announcement[] = [];
  private lastBannerId = -1;
  private destroyed = false;

  /** What the current selection would play as ("Pair of 5s"), if anything. */
  protected readonly selectionDesc = computed(() => {
    const g = this.game();
    const uids = [...this.selected()];
    return g && uids.length ? g.describe(uids) : null;
  });

  protected readonly canPlay = computed(() => {
    const g = this.game();
    if (!g) {
      return false;
    }
    g.state(); // track state so the button re-evaluates after every move
    return g.canPlay([...this.selected()]);
  });

  protected readonly canPass = computed(() => {
    const g = this.game();
    if (!g) {
      return false;
    }
    g.state();
    return g.canPass();
  });

  protected readonly turnText = computed(() => {
    const g = this.game();
    if (!g) {
      return '';
    }
    if (g.phase() === 'round-over') {
      return 'Round over';
    }
    if (g.phase() === 'exchange') {
      return 'Card exchange';
    }
    if (g.isHumanTurn()) {
      return 'Your turn';
    }
    return `${this.labelOf(g.current())} is playing…`;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => void this.init());

    // Queue notable moments so rapid ones (a skip, then a trick win, then the
    // exchange) each get their beat instead of clobbering each other.
    effect(() => {
      const announcement = this.game()?.announcement();
      if (announcement) {
        this.enqueueBanner(announcement);
      }
    });

    destroyRef.onDestroy(() => {
      this.destroyed = true;
      if (this.bannerTimer) {
        clearTimeout(this.bannerTimer);
      }
      this.themeObserver?.disconnect();
      this.themeObserver = null;
      this.game()?.dispose();
      this.renderer?.dispose();
      this.renderer = null;
    });
  }

  private async init(): Promise<void> {
    const renderer = await CardRenderer.create(this.canvasRef().nativeElement, this.readTheme());
    if (this.destroyed) {
      renderer?.dispose();
      return;
    }
    if (!renderer) {
      this.status.set('unsupported');
      return;
    }
    this.renderer = renderer;

    // The loop reads this.game() every frame; it renders nothing until one is set,
    // so the renderer can run while we connect (or retry).
    renderer.setLayout((w, h, t) => {
      const g = this.game();
      if (!g || !g.state()) {
        return [];
      }
      const dt = this.lastTime ? t - this.lastTime : 0;
      this.lastTime = t;
      const layout = layoutTable(
        g.state(),
        g.humanId,
        this.selected(),
        this.hoveredUid,
        this.sidebarOpen(),
        w,
        h,
      );
      this.handPicks = layout.picks;
      return this.animator.step(layout.sprites, dt);
    });
    renderer.start();

    this.themeObserver = new MutationObserver(() => this.renderer?.applyTheme(this.readTheme()));
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    await this.loadGame();
  }

  /** Build (or rebuild) the game; surface a live-connect failure as 'offline'. */
  private async loadGame(): Promise<void> {
    this.status.set('init');
    let game: PresidentGame;
    try {
      game = await this.buildGame();
    } catch (err) {
      if (err instanceof LiveConnectError) {
        console.error('[president] live game connect failed:', err.reason);
        this.liveError.set(err.message);
      } else {
        console.error('[president] failed to load game:', err);
        this.liveError.set('Something went wrong loading this game.');
      }
      this.status.set('offline');
      return;
    }
    if (this.destroyed) {
      game.dispose();
      return;
    }
    this.activate(game);
  }

  private activate(game: PresidentGame): void {
    this.game()?.dispose();
    this.selected.set(new Set());
    this.resetBanners();
    this.game.set(game);
    this.status.set('ready');
  }

  private resetBanners(): void {
    this.bannerQueue = [];
    this.lastBannerId = -1;
    if (this.bannerTimer) {
      clearTimeout(this.bannerTimer);
      this.bannerTimer = null;
    }
    this.banner.set(null);
  }

  private enqueueBanner(a: Announcement): void {
    if (a.id === this.lastBannerId) {
      return; // already queued this one (effect can re-run)
    }
    this.lastBannerId = a.id;
    this.bannerQueue.push(a);
    if (this.bannerQueue.length > 4) {
      this.bannerQueue.shift(); // drop the stalest if we're backed up
    }
    if (!this.bannerTimer) {
      this.showNextBanner();
    }
  }

  private showNextBanner(): void {
    const a = this.bannerQueue.shift();
    if (!a) {
      this.banner.set(null);
      this.bannerTimer = null;
      return;
    }
    this.banner.set({ text: a.text, kind: a.kind });
    // Cap each on-screen time so a backlog still drains promptly.
    this.bannerTimer = setTimeout(() => {
      this.bannerTimer = null;
      this.showNextBanner();
    }, Math.min(a.duration, 2000));
  }

  /** From the offline panel: try the live connection again. */
  protected retry(): void {
    void this.loadGame();
  }

  /** From the offline panel: play this table's roster locally vs bots instead. */
  protected playOffline(): void {
    const seed = Math.floor(Math.random() * 0x7fffffff);
    const lobbyGame = this.lastLobbyGame();
    this.activate(lobbyGame ? this.localFromLobby(lobbyGame, seed) : this.localGame(SLOTS, seed, 2));
  }

  protected onCanvasClick(event: MouseEvent): void {
    const g = this.game();
    if (!g || !this.canSelect(g)) {
      return;
    }
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    const uid = hitTest(this.handPicks, event.clientX - rect.left, event.clientY - rect.top);
    if (!uid) {
      return;
    }
    const next = new Set(this.selected());
    if (next.has(uid)) {
      next.delete(uid);
    } else {
      next.add(uid);
    }
    this.selected.set(next);
  }

  protected onCanvasMove(event: MouseEvent): void {
    const g = this.game();
    const canvas = this.canvasRef().nativeElement;
    if (!g || !this.canSelect(g)) {
      this.hoveredUid = null;
      canvas.style.cursor = 'default';
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const uid = hitTest(this.handPicks, event.clientX - rect.left, event.clientY - rect.top);
    this.hoveredUid = uid;
    canvas.style.cursor = uid ? 'pointer' : 'default';
  }

  protected onCanvasLeave(): void {
    this.hoveredUid = null;
    this.canvasRef().nativeElement.style.cursor = 'default';
  }

  /** Cards are selectable on the human's turn, or while owing an exchange. */
  private canSelect(g: PresidentGame): boolean {
    return g.isHumanTurn() || g.humanExchange() !== null;
  }

  protected onPlay(): void {
    if (this.game()?.play([...this.selected()])) {
      this.selected.set(new Set());
    }
  }

  protected onPass(): void {
    if (this.game()?.pass()) {
      this.selected.set(new Set());
    }
  }

  protected onGive(): void {
    if (this.game()?.submitExchange([...this.selected()])) {
      this.selected.set(new Set());
    }
  }

  protected onClear(): void {
    this.selected.set(new Set());
  }

  protected onNextRound(): void {
    this.game()?.nextRound();
    this.selected.set(new Set());
  }

  protected roleLabel(role: Role | null): string {
    return role ? ROLE_LABEL[role] : '';
  }

  private labelOf(id: string | null): string {
    return this.game()?.seats().find((s) => s.id === id)?.label ?? '';
  }

  /**
   * 'local' (Quick play) or any failure → an offline 4-player game vs bots.
   * A real game id → connect to the server-run table over STOMP: seed from the
   * REST snapshot, then stream live state + events. If we can't join it live
   * (not signed in, not seated, not yet active, connection fails), fall back to
   * playing that table's roster locally so the page still works.
   */
  private async buildGame(): Promise<PresidentGame> {
    const seed = Math.floor(Math.random() * 0x7fffffff);
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || id === 'local') {
      return this.localGame(SLOTS, seed, 2);
    }

    let me;
    let lobbyGame: LobbyGame;
    try {
      if (!this.lobby.currentUser()) {
        await this.lobby.loadMe();
      }
      me = this.lobby.currentUser();
      lobbyGame = await this.lobby.getGame(id);
    } catch (err) {
      // Can't even read the lobby (not signed in, backend down) → offline preview.
      console.warn('[president] lobby unavailable; playing offline', err);
      return this.localGame(SLOTS, seed, 2);
    }
    this.lastLobbyGame.set(lobbyGame);

    const seated = !!me && lobbyGame.seats.some((s) => s.kind !== 'bot' && s.userId === me!.id);
    if (!me || !seated || lobbyGame.status !== 'active') {
      // Not a live game we're seated in (waiting room, spectating) → preview locally.
      return this.localFromLobby(lobbyGame, seed);
    }

    // A live game we're seated in: connect for real. A failure here is surfaced
    // (not silently replaced by a fresh local deal that would look like a reset).
    let socket: GameSocket | undefined;
    try {
      const initialState = await this.lobby.getState(id);
      socket = new GameSocket(this.http, id);
      const game = new PresidentGame({
        mode: 'online',
        slots: this.onlineSlots(lobbyGame, me.id),
        humanId: me.id,
        initialState,
        transport: socket,
      });
      await game.connect();
      return game;
    } catch (err) {
      socket?.dispose(); // don't leak a reconnecting socket on failure
      throw new LiveConnectError('Couldn’t reach the live game.', err);
    }
  }

  /** Seats mapped to the server's engine ids: bots by slot, humans by subject. */
  private onlineSlots(game: LobbyGame, meId: string): PlayerSlot[] {
    return game.seats
      .filter((seat) => seat.kind !== 'empty')
      .map((seat) => {
        const isHuman = seat.kind !== 'bot' && seat.userId === meId;
        return {
          id: seat.kind === 'bot' ? `bot:${seat.index}` : seat.userId ?? `seat-${seat.index}`,
          label: isHuman ? 'You' : seat.name ?? `Seat ${seat.index + 1}`,
          isHuman,
        };
      });
  }

  private localGame(slots: readonly PlayerSlot[], seed: number, decks: number): PresidentGame {
    return new PresidentGame({ mode: 'local', slots, seed, decks });
  }

  /** Offline fallback: play this table's roster with you as the one human. */
  private localFromLobby(game: LobbyGame, seed: number): PresidentGame {
    const meId = this.lobby.currentUser()?.id ?? null;
    let slots: PlayerSlot[] = game.seats
      .filter((seat) => seat.kind !== 'empty')
      .map((seat) => {
        const isHuman = seat.userId != null && seat.userId === meId;
        return { id: `p${seat.index}`, label: isHuman ? 'You' : seat.name ?? `Seat ${seat.index + 1}`, isHuman };
      });
    if (slots.length < 2) {
      return this.localGame(SLOTS, seed, 2);
    }
    if (!slots.some((s) => s.isHuman)) {
      slots = slots.map((s, i) => (i === 0 ? { ...s, label: 'You', isHuman: true } : s));
    }
    return this.localGame(slots, seed, game.decks);
  }

  /** Pulls the site's design tokens off <html> so the table matches the theme. */
  private readTheme(): CardTheme {
    const css = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string): string =>
      css.getPropertyValue(name).trim() || fallback;
    return {
      bg: token('--color-bg', '#0a0a0b'),
      surface: token('--color-bg-subtle', '#111113'),
      ink: token('--color-fg', '#f4f4f5'),
      muted: token('--color-fg-muted', '#a1a1aa'),
      faint: token('--color-rule', '#1f1f23'),
    };
  }
}
