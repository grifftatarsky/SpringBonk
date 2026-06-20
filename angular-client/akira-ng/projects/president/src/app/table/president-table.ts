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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CardRenderer } from '../render/card-renderer';
import { CardTheme } from '../render/card-atlas';
import { Role } from '../game/state';
import { LobbyService } from '../lobby/lobby.service';
import { PlayerSlot, PresidentGame } from './president-game';
import { hitTest, layoutTable, PickRect } from './layout';
import { Animator } from './animator';
import { RulesDialog } from './rules-dialog';

type Status = 'init' | 'ready' | 'unsupported';

const SLOTS: readonly PlayerSlot[] = [
  { id: 'you', label: 'You', isHuman: true },
  { id: 'west', label: 'West', isHuman: false },
  { id: 'north', label: 'North', isHuman: false },
  { id: 'east', label: 'East', isHuman: false },
];

const ROLE_LABEL: Readonly<Record<Role, string>> = {
  president: 'President',
  'vice-president': 'VP',
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
  protected readonly status = signal<Status>('init');
  protected readonly rulesOpen = signal(false);
  protected readonly game = signal<PresidentGame | null>(null);
  protected readonly selected = signal<ReadonlySet<string>>(new Set());
  protected readonly sidebarOpen = signal(true);

  /** Transient on-table banner ("West takes the trick", "…— President!"). */
  protected readonly banner = signal<{ text: string; kind: string } | null>(null);

  private renderer: CardRenderer | null = null;
  private themeObserver: MutationObserver | null = null;
  private readonly animator = new Animator();
  private handPicks: PickRect[] = [];
  private hoveredUid: string | null = null;
  private lastTime = 0;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;
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

    // Surface each notable engine event as a banner that auto-dismisses.
    effect(() => {
      const announcement = this.game()?.announcement();
      if (!announcement) {
        return;
      }
      this.banner.set({ text: announcement.text, kind: announcement.kind });
      if (this.bannerTimer) {
        clearTimeout(this.bannerTimer);
      }
      this.bannerTimer = setTimeout(() => this.banner.set(null), announcement.duration);
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
    const game = await this.buildGame();
    if (this.destroyed) {
      game.dispose();
      renderer.dispose();
      return;
    }
    this.game.set(game);

    renderer.setLayout((w, h, t) => {
      const g = this.game();
      if (!g) {
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
    this.status.set('ready');

    this.themeObserver = new MutationObserver(() => this.renderer?.applyTheme(this.readTheme()));
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
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
   * Build the local game from the lobby game in the route, or a default table.
   * 'local' (Quick play) and any fetch failure fall back to an offline 4-player
   * game vs bots. Until the STOMP runtime lands, online games are still played
   * locally from the agreed config (your seat = human, the rest bots).
   */
  private async buildGame(): Promise<PresidentGame> {
    const seed = Math.floor(Math.random() * 0x7fffffff);
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || id === 'local') {
      return new PresidentGame(SLOTS, seed);
    }
    let lobbyGame;
    try {
      if (!this.lobby.currentUser()) {
        await this.lobby.loadMe();
      }
      lobbyGame = await this.lobby.getGame(id);
    } catch {
      return new PresidentGame(SLOTS, seed);
    }
    const meId = this.lobby.currentUser()?.id ?? null;
    let slots: PlayerSlot[] = lobbyGame.seats
      .filter((seat) => seat.kind !== 'empty')
      .map((seat) => {
        const isHuman = seat.userId != null && seat.userId === meId;
        return {
          id: `p${seat.index}`,
          label: isHuman ? 'You' : seat.name ?? `Seat ${seat.index + 1}`,
          isHuman,
        };
      });
    if (slots.length < 2) {
      return new PresidentGame(SLOTS, seed);
    }
    // One real human (you) locally; ensure exactly one seat is playable.
    if (!slots.some((s) => s.isHuman)) {
      slots = slots.map((s, i) => (i === 0 ? { ...s, label: 'You', isHuman: true } : s));
    }
    return new PresidentGame(slots, seed, lobbyGame.decks);
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
