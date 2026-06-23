import { computed, signal } from '@angular/core';
import { GameEngine } from '../game/engine';
import { Combo, describeCombo, isSingleTwo } from '../game/combo';
import { chooseBotAction } from '../game/bot';
import { chooseGiveBack } from '../game/exchange';
import { Action, GameEvent } from '../game/actions';
import { GameState, PlayerId, Role } from '../game/state';

export interface PlayerSlot {
  readonly id: PlayerId;
  readonly label: string;
  readonly isHuman: boolean;
}

export interface SeatInfo {
  readonly id: PlayerId;
  readonly label: string;
  readonly role: Role | null;
  readonly handCount: number;
  readonly isHuman: boolean;
  readonly isCurrent: boolean;
  readonly finished: boolean;
}

export interface StandingRow {
  readonly id: PlayerId;
  readonly label: string;
  readonly role: Role | null;
}

/** One line in the running play log ("West — Pair of 5s", "North — passed"). */
export interface LogEntry {
  readonly id: number;
  readonly text: string;
}

/** A transient banner for a notable moment (trick won, someone goes out…). */
export interface Announcement {
  readonly id: number;
  readonly text: string;
  readonly kind: 'neutral' | 'good' | 'bad';
  readonly duration: number;
}

/** A running tally per player, surfaced on the seat hover tooltip. */
export interface PlayerStats {
  readonly trickWins: number;
  readonly roles: Readonly<Record<Role, number>>;
}

/** Full role names for announcements (the sidebar uses its own short labels). */
const ROLE_NAME: Readonly<Record<Role, string>> = {
  president: 'President',
  'vice-president': 'Vice-President',
  citizen: 'Citizen',
  'vice-asshole': 'Vice-Asshole',
  asshole: 'Asshole',
};

function zeroStats(): PlayerStats {
  return {
    trickWins: 0,
    roles: { president: 0, 'vice-president': 0, citizen: 0, 'vice-asshole': 0, asshole: 0 },
  };
}

const BOT_DELAY_MS = 750;

/**
 * The live channel for an online game. The controller stays engine-shaped; the
 * transport just carries actions out and streams authoritative state + events
 * back in. {@link GameSocket} implements this over STOMP.
 */
export interface GameTransport {
  connect(
    onState: (view: GameState) => void,
    onEvents: (events: readonly GameEvent[]) => void,
  ): Promise<void>;
  send(action: Action): void;
  next(): void;
  dispose(): void;
}

/** Local game vs bots, or an online seat at a server-run table. */
export type GameConfig =
  | { readonly mode: 'local'; readonly slots: readonly PlayerSlot[]; readonly seed: number; readonly decks: number }
  | {
      readonly mode: 'online';
      readonly slots: readonly PlayerSlot[];
      readonly humanId: PlayerId;
      readonly initialState: GameState;
      readonly transport: GameTransport;
    };

/**
 * Client-side game session: exposes engine state as Angular signals for the
 * table to render. Locally it wraps the pure {@link GameEngine} and drives the
 * bots; online it sends actions to the server and applies the redacted state +
 * events streamed back (the server is authoritative and drives the bots). Either
 * way it keeps a local engine — locally the source of truth, online a mirror of
 * the latest pushed view, used only for read-only checks (canPlay/describe).
 */
export class PresidentGame {
  private engine: GameEngine;
  private readonly slots: readonly PlayerSlot[];
  private readonly online: boolean;
  private readonly transport: GameTransport | null;
  private readonly _state = signal<GameState>(undefined as unknown as GameState);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  readonly humanId: PlayerId;
  readonly state = this._state.asReadonly();
  readonly botThinking = signal(false);

  private readonly _log = signal<LogEntry[]>([]);
  /** Recent actions (oldest → newest), so you can see what opponents played. */
  readonly log = this._log.asReadonly();
  private logSeq = 0;

  private readonly _announcement = signal<Announcement | null>(null);
  /** The latest notable moment, for the on-table banner. */
  readonly announcement = this._announcement.asReadonly();
  private announceSeq = 0;

  /** The most recent play (combo + who) — context for skip / trick-win banners. */
  private lastPlay: { playerId: PlayerId; combo: Combo } | null = null;
  private readonly _stats = signal<Record<PlayerId, PlayerStats>>({});
  /** Per-player running tally (tricks won, roles earned) for the seat tooltip. */
  readonly stats = this._stats.asReadonly();

  readonly phase = computed(() => this._state().phase);
  readonly current = computed(() => {
    const s = this._state();
    return s.players[s.turn]?.id ?? null;
  });
  readonly isHumanTurn = computed(() => this.phase() === 'playing' && this.current() === this.humanId);

  readonly seats = computed<SeatInfo[]>(() => {
    const s = this._state();
    return this.slots.map((slot) => {
      const p = s.players.find((pp) => pp.id === slot.id)!;
      return {
        id: slot.id,
        label: slot.label,
        role: p.role,
        handCount: p.hand.length,
        isHuman: slot.isHuman,
        isCurrent: s.phase === 'playing' && s.turn === p.seat,
        finished: p.finished,
      };
    });
  });

  readonly standings = computed<StandingRow[] | null>(() => {
    const s = this._state();
    if (s.phase !== 'round-over' || !s.standings) {
      return null;
    }
    return s.standings.map((id) => {
      const slot = this.slots.find((sl) => sl.id === id)!;
      const player = s.players.find((p) => p.id === id)!;
      return { id, label: slot.label, role: player.role };
    });
  });

  /** The human's pending give-back this exchange phase, or null. */
  readonly humanExchange = computed(() => {
    const s = this._state();
    if (s.phase !== 'exchange') {
      return null;
    }
    const debt = s.pendingExchanges.find((e) => e.from === this.humanId);
    if (!debt) {
      return null;
    }
    const me = s.players.find((p) => p.id === this.humanId)!;
    return { count: debt.count, toLabel: this.labelOf(debt.to), role: me.role };
  });

  constructor(config: GameConfig) {
    this.slots = config.slots;
    if (config.mode === 'online') {
      this.online = true;
      this.transport = config.transport;
      this.humanId = config.humanId;
      this.engine = GameEngine.fromState(config.initialState);
      this._state.set(config.initialState);
    } else {
      this.online = false;
      this.transport = null;
      this.humanId = config.slots.find((s) => s.isHuman)?.id ?? config.slots[0].id;
      this.engine = GameEngine.newGame(config.slots.map((s) => s.id), config.seed, config.decks);
      this.snapshot();
      this.maybeRunBots();
    }
  }

  /** Online only: open the live channel; state pushes and events flow in. */
  async connect(): Promise<void> {
    await this.transport?.connect(
      (view) => this.applyView(view),
      (events) => this.record(events),
    );
  }

  /** Replace our mirror with the server's latest redacted state for us. */
  private applyView(view: GameState): void {
    this.engine = GameEngine.fromState(view);
    this._state.set(view);
  }

  /** Whether the given selection is a legal play for the human right now. */
  canPlay(uids: readonly string[]): boolean {
    return (
      uids.length > 0 &&
      this.engine.validate({ type: 'play', playerId: this.humanId, cardUids: uids }) === null
    );
  }

  canPass(): boolean {
    return this.engine.validate({ type: 'pass', playerId: this.humanId }) === null;
  }

  /** A label for what the selection would play as, or null if it isn't a set. */
  describe(uids: readonly string[]): string | null {
    const combo = this.engine.comboOf(this.humanId, uids);
    return combo ? describeCombo(combo) : null;
  }

  /** The running tally for a player (zeroed until something's happened). */
  statsFor(id: PlayerId): PlayerStats {
    return this._stats()[id] ?? zeroStats();
  }

  play(uids: readonly string[]): boolean {
    if (!this.isHumanTurn()) {
      return false;
    }
    if (this.online) {
      this.transport!.send({ type: 'play', playerId: this.humanId, cardUids: [...uids] });
      return true;
    }
    try {
      this.dispatchAndRecord({ type: 'play', playerId: this.humanId, cardUids: uids });
    } catch {
      return false;
    }
    this.snapshot();
    this.maybeRunBots();
    return true;
  }

  pass(): boolean {
    if (!this.isHumanTurn()) {
      return false;
    }
    if (this.online) {
      this.transport!.send({ type: 'pass', playerId: this.humanId });
      return true;
    }
    try {
      this.dispatchAndRecord({ type: 'pass', playerId: this.humanId });
    } catch {
      return false;
    }
    this.snapshot();
    this.maybeRunBots();
    return true;
  }

  /** From round results: re-deal, take mandatory cards, enter the exchange. */
  nextRound(): void {
    if (this.online) {
      this.transport!.next();
      return;
    }
    if (this.engine.phase !== 'round-over') {
      return;
    }
    this.record(this.engine.beginExchange());
    this.resolveBotExchanges(); // snapshots; leaves the human's debt (if any)
    if (this.engine.state.phase === 'playing') {
      this.maybeRunBots();
    }
  }

  /** The human (President/VP) submits the cards they choose to give back. */
  submitExchange(uids: readonly string[]): boolean {
    if (!this.humanExchange()) {
      return false;
    }
    if (this.online) {
      this.transport!.send({ type: 'exchange', playerId: this.humanId, cardUids: [...uids] });
      return true;
    }
    try {
      this.dispatchAndRecord({ type: 'exchange', playerId: this.humanId, cardUids: uids });
    } catch {
      return false;
    }
    this.resolveBotExchanges();
    if (this.engine.state.phase === 'playing') {
      this.maybeRunBots();
    }
    return true;
  }

  dispose(): void {
    this.disposed = true;
    this.clearTimer();
    this.transport?.dispose();
  }

  /** Auto-resolve every owed give-back that belongs to a bot. */
  private resolveBotExchanges(): void {
    let guard = 0;
    for (;;) {
      const debt = this.engine.state.pendingExchanges.find((e) => e.from !== this.humanId);
      if (!debt) {
        break;
      }
      const giver = this.engine.state.players.find((p) => p.id === debt.from)!;
      const give = chooseGiveBack(giver.hand, debt.count);
      try {
        this.dispatchAndRecord({ type: 'exchange', playerId: debt.from, cardUids: give.map((c) => c.uid) });
      } catch (err) {
        console.error('Bot exchange failed', err);
        break;
      }
      if (++guard > 10) {
        break;
      }
    }
    this.snapshot();
  }

  private labelOf(id: PlayerId): string {
    return this.slots.find((s) => s.id === id)?.label ?? '';
  }

  /** Dispatch an action and fold its events into the play log. Throws if illegal. */
  private dispatchAndRecord(action: Action): void {
    this.record(this.engine.dispatch(action));
  }

  private record(events: readonly GameEvent[]): void {
    let entries = this._log();
    for (const e of events) {
      if (e.type === 'round-started') {
        entries = []; // fresh round, fresh log
      }
      if (e.type === 'played') {
        this.lastPlay = { playerId: e.playerId, combo: e.combo };
      }
      this.updateStats(e);
      const line = this.lineFor(e);
      if (line) {
        entries = [...entries, { id: this.logSeq++, text: line }];
      }
    }
    this._log.set(entries.slice(-6));
    this.announce(events);
  }

  /** Accumulate the per-player tally from trick wins and end-of-round roles. */
  private updateStats(e: GameEvent): void {
    if (e.type === 'trick-won') {
      this.bumpStat(e.playerId, (st) => ({ ...st, trickWins: st.trickWins + 1 }));
    } else if (e.type === 'round-over') {
      // Online the role map arrives as a plain object; normalise both shapes.
      const roles: ReadonlyMap<PlayerId, Role> =
        e.roles instanceof Map
          ? e.roles
          : new Map(Object.entries(e.roles as unknown as Record<string, Role>));
      for (const [id, role] of roles) {
        this.bumpStat(id, (st) => ({ ...st, roles: { ...st.roles, [role]: st.roles[role] + 1 } }));
      }
    }
  }

  private bumpStat(id: PlayerId, fn: (st: PlayerStats) => PlayerStats): void {
    this._stats.update((s) => ({ ...s, [id]: fn(s[id] ?? zeroStats()) }));
  }

  /** Raise a banner for the single most notable event in this batch. */
  private announce(events: readonly GameEvent[]): void {
    let best: { text: string; kind: Announcement['kind']; duration: number; priority: number } | null = null;
    for (const e of events) {
      if (e.type === 'round-started') {
        this._announcement.set(null); // clear stale banner into the new round
      }
      const a = this.announcementFor(e);
      if (a && (best === null || a.priority > best.priority)) {
        best = a;
      }
    }
    if (best) {
      this._announcement.set({
        id: this.announceSeq++,
        text: best.text,
        kind: best.kind,
        duration: best.duration,
      });
    }
  }

  private announcementFor(
    e: GameEvent,
  ): { text: string; kind: Announcement['kind']; duration: number; priority: number } | null {
    switch (e.type) {
      case 'player-bottomed':
        return {
          text: this.says(e.playerId, 'You ended on a 2 — to the bottom!', 'ended on a 2 — to the bottom!'),
          kind: 'bad',
          duration: 2800,
          priority: 3,
        };
      case 'player-finished': {
        const n = this.slots.length;
        if (e.place === 1) {
          return {
            text: this.says(e.playerId, "You're out first — President! 👑", 'is out first — President! 👑'),
            kind: 'good',
            duration: 2600,
            priority: 2,
          };
        }
        if (e.place === 2 && n >= 4) {
          return {
            text: this.says(e.playerId, "You're out second — Vice-President!", 'is out second — Vice-President!'),
            kind: 'good',
            duration: 2600,
            priority: 2,
          };
        }
        return {
          text: this.says(e.playerId, `You're out — ${ordinal(e.place)} place`, `is out — ${ordinal(e.place)} place`),
          kind: 'neutral',
          duration: 2200,
          priority: 2,
        };
      }
      case 'played': {
        const c = e.combo;
        if (isSingleTwo(c)) {
          return {
            text: this.says(e.playerId, 'You slam a 2 — trick over! 🚫', 'slams a 2 — trick over! 🚫'),
            kind: 'bad',
            duration: 2200,
            priority: 2,
          };
        }
        if (c.rank !== '7' && c.cards.some((card) => card.rank === '7')) {
          return {
            text: this.says(e.playerId, `You go wild — ${describeCombo(c)}! 🃏`, `goes wild — ${describeCombo(c)} 🃏`),
            kind: 'good',
            duration: 2000,
            priority: 1,
          };
        }
        return null;
      }
      case 'skipped': {
        const what = this.lastPlay ? describeCombo(this.lastPlay.combo) : 'A match';
        const hitMe = e.playerIds.includes(this.humanId);
        const who = hitMe && e.playerIds.length === 1 ? 'you' : this.listLabels(e.playerIds);
        return {
          text: `${what} — skips ${who}! ⏭`,
          kind: hitMe ? 'bad' : 'neutral',
          duration: 1900,
          priority: 2,
        };
      }
      case 'trick-won':
        // The 2-slam banner already announced the ending; don't double up.
        if (this.lastPlay?.playerId === e.playerId && isSingleTwo(this.lastPlay.combo)) {
          return null;
        }
        return {
          text: this.says(e.playerId, 'You take the trick', 'takes the trick'),
          kind: 'neutral',
          duration: 1600,
          priority: 1,
        };
      case 'exchanged':
        return this.exchangeAnnouncement(e);
      default:
        return null;
    }
  }

  /** Frame an exchange from the human's seat — getting the spoils vs. losing your best. */
  private exchangeAnnouncement(
    e: { from: PlayerId; to: PlayerId; count: number },
  ): { text: string; kind: Announcement['kind']; duration: number; priority: number } | null {
    const cards = `${e.count} card${e.count === 1 ? '' : 's'}`;
    const myRole = this.roleOf(this.humanId);
    const topDog = myRole === 'president' || myRole === 'vice-president';
    const bottomDog = myRole === 'asshole' || myRole === 'vice-asshole';
    if (e.to === this.humanId) {
      return topDog
        ? { text: `The ${this.otherName(e.from)}’s best ${cards} — yours now 👑`, kind: 'good', duration: 2600, priority: 2 }
        : { text: `The ${this.otherName(e.from)} hands you ${cards}`, kind: 'neutral', duration: 2200, priority: 2 };
    }
    if (e.from === this.humanId) {
      return bottomDog
        ? {
            text: `Your best ${cards} ${e.count === 1 ? 'goes' : 'go'} to the ${this.otherName(e.to)} 😬`,
            kind: 'bad',
            duration: 2600,
            priority: 2,
          }
        : { text: `You hand ${cards} to the ${this.otherName(e.to)}`, kind: 'neutral', duration: 2200, priority: 2 };
    }
    return null; // bot ↔ bot: log line only
  }

  private roleOf(id: PlayerId): Role | null {
    return this._state().players.find((p) => p.id === id)?.role ?? null;
  }

  /** A player's current role name, falling back to their seat label. */
  private otherName(id: PlayerId): string {
    const role = this.roleOf(id);
    return role ? ROLE_NAME[role] : this.labelOf(id);
  }

  private listLabels(ids: readonly PlayerId[]): string {
    return ids.map((id) => this.labelOf(id)).join(', ');
  }

  /** Conjugate for the human ("You take…") vs an opponent ("West takes…"). */
  private says(id: PlayerId, you: string, third: string): string {
    return id === this.humanId ? you : `${this.labelOf(id)} ${third}`;
  }

  private lineFor(e: GameEvent): string | null {
    switch (e.type) {
      case 'played':
        return `${this.labelOf(e.playerId)} — ${describeCombo(e.combo)}`;
      case 'passed':
        return `${this.labelOf(e.playerId)} — passed`;
      case 'skipped':
        return `Skipped: ${this.listLabels(e.playerIds)}`;
      case 'exchanged':
        return `${this.labelOf(e.from)} → ${this.labelOf(e.to)}: ${e.count} card${e.count === 1 ? '' : 's'}`;
      case 'trick-won':
        return this.says(e.playerId, 'You take the trick', 'takes the trick');
      default:
        return null;
    }
  }

  private snapshot(): void {
    this._state.set(structuredClone(this.engine.state));
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private maybeRunBots(): void {
    if (this.disposed || this.online) {
      return; // online: the server drives the bots
    }
    this.clearTimer();
    const s = this.engine.state;
    if (s.phase !== 'playing' || s.players[s.turn].id === this.humanId) {
      this.botThinking.set(false);
      return;
    }
    this.botThinking.set(true);
    const botId = s.players[s.turn].id;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.disposed) {
        return;
      }
      const action = chooseBotAction(this.engine, botId);
      try {
        this.dispatchAndRecord(action);
      } catch (err) {
        console.error('Bot produced an illegal action', action, err);
        this.botThinking.set(false);
        return;
      }
      this.snapshot();
      this.maybeRunBots();
    }, BOT_DELAY_MS);
  }
}

function ordinal(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}
