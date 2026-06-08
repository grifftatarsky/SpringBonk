import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { Die3d } from './die-3d';
import { DieIcon } from './die-icon';

type RollMode = 'normal' | 'adv' | 'dis';

/** One physical die: its raw roll(s) and the value kept after adv/dis. */
interface DieRoll {
  readonly rolls: readonly number[];
  readonly picked: number;
}

interface RollResult {
  readonly die: number;
  readonly count: number;
  readonly mode: RollMode;
  readonly modifier: number;
  readonly dice: readonly DieRoll[];
  readonly subtotal: number;
  readonly total: number;
}

const MAX_COUNT = 20;

/**
 * Client-side dice roller. Mirrors the backend DiceUtil semantics:
 * advantage = max of two rolls, disadvantage = min of two — applied per die.
 * Rolls up to 20 dice at once; history is in-memory only. View-only for now.
 */
@Component({
  selector: 'ooze-dice-roller',
  imports: [Die3d, DieIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dice-roller.html',
  styleUrl: './dice-roller.css',
})
export class DiceRoller {
  protected readonly dice = [4, 6, 8, 10, 12, 20, 100] as const;
  protected readonly maxCount = MAX_COUNT;

  protected readonly die = signal(20);
  protected readonly count = signal(1);
  protected readonly modifier = signal(0);
  protected readonly mode = signal<RollMode>('normal');
  protected readonly rolling = signal(false);
  protected readonly result = signal<RollResult | null>(null);
  protected readonly history = signal<readonly RollResult[]>([]);

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  protected selectDie(d: number): void {
    if (this.rolling()) return;
    this.die.set(d);
    this.result.set(null);
  }

  protected adjustCount(delta: number): void {
    if (this.rolling()) return;
    this.count.set(Math.max(1, Math.min(MAX_COUNT, this.count() + delta)));
  }

  protected adjustModifier(delta: number): void {
    if (this.rolling()) return;
    this.modifier.set(Math.max(-20, Math.min(20, this.modifier() + delta)));
  }

  protected toggleMode(m: Exclude<RollMode, 'normal'>): void {
    if (this.rolling()) return;
    this.mode.update(cur => (cur === m ? 'normal' : m));
  }

  protected roll(): void {
    if (this.rolling()) return;
    this.rolling.set(true);
    this.result.set(null);

    // Let the 3D dice tumble for a beat, then settle on the real roll.
    this.clearTimer();
    this.timer = setTimeout(() => this.settle(), 750);
  }

  private settle(): void {
    this.clearTimer();
    const die = this.die();
    const count = this.count();
    const mode = this.mode();
    const modifier = this.modifier();

    const dice: DieRoll[] = [];
    for (let i = 0; i < count; i++) {
      const rolls =
        mode === 'normal'
          ? [this.rollRaw(die)]
          : [this.rollRaw(die), this.rollRaw(die)];
      const picked =
        mode === 'adv'
          ? Math.max(...rolls)
          : mode === 'dis'
            ? Math.min(...rolls)
            : rolls[0];
      dice.push({ rolls, picked });
    }

    const subtotal = dice.reduce((sum, d) => sum + d.picked, 0);
    const result: RollResult = {
      die,
      count,
      mode,
      modifier,
      dice,
      subtotal,
      total: subtotal + modifier,
    };
    this.result.set(result);
    this.history.update(h => [result, ...h].slice(0, 8));
    this.rolling.set(false);
  }

  private rollRaw(die: number): number {
    return Math.floor(Math.random() * die) + 1;
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  protected clearHistory(): void {
    this.history.set([]);
  }

  protected modLabel(m: number): string {
    if (m === 0) return '';
    return m > 0 ? ` + ${m}` : ` − ${Math.abs(m)}`;
  }

  /** Compact formula, e.g. "3d20 adv + 2". */
  protected formula(r: {
    count: number;
    die: number;
    mode: RollMode;
    modifier: number;
  }): string {
    const tag = r.mode === 'adv' ? ' adv' : r.mode === 'dis' ? ' dis' : '';
    return `${r.count}d${r.die}${tag}${this.modLabel(r.modifier)}`;
  }
}
