import { computed, signal } from '@angular/core';
import { GameEngine } from '../game/engine';
import { describeCombo } from '../game/combo';
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

const BOT_DELAY_MS = 750;

/**
 * Client-side game session: wraps the pure {@link GameEngine}, exposes its state
 * as Angular signals, and drives the bot turn loop. When this goes online, this
 * adapter is what changes — `play`/`pass` would post actions to a server and
 * apply the events it streams back, instead of calling the engine directly.
 */
export class PresidentGame {
  private readonly engine: GameEngine;
  private readonly slots: readonly PlayerSlot[];
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

  constructor(slots: readonly PlayerSlot[], seed: number, decks = 2) {
    this.slots = slots;
    this.humanId = slots.find((s) => s.isHuman)?.id ?? slots[0].id;
    this.engine = GameEngine.newGame(slots.map((s) => s.id), seed, decks);
    this.snapshot();
    this.maybeRunBots();
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

  play(uids: readonly string[]): boolean {
    if (!this.isHumanTurn()) {
      return false;
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
      const line = this.lineFor(e);
      if (line) {
        entries = [...entries, { id: this.logSeq++, text: line }];
      }
    }
    this._log.set(entries.slice(-6));
    this.announce(events);
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
      case 'trick-won':
        return {
          text: this.says(e.playerId, 'You take the trick', 'takes the trick'),
          kind: 'neutral',
          duration: 1600,
          priority: 1,
        };
      default:
        return null;
    }
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
    if (this.disposed) {
      return;
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
