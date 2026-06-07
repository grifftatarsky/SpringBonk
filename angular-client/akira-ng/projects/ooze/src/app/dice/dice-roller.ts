import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';

type RollMode = 'normal' | 'adv' | 'dis';

interface RollResult {
  readonly die: number;
  readonly rolls: readonly number[];
  readonly picked: number;
  readonly modifier: number;
  readonly total: number;
  readonly mode: RollMode;
}

/**
 * Client-side dice roller. Mirrors the backend DiceUtil semantics:
 * advantage = max of two rolls, disadvantage = min of two. View-only for now.
 */
@Component({
  selector: 'ooze-dice-roller',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dice-roller.html',
  styleUrl: './dice-roller.css',
})
export class DiceRoller {
  protected readonly dice = [4, 6, 8, 10, 12, 20, 100] as const;

  protected readonly die = signal(20);
  protected readonly modifier = signal(0);
  protected readonly mode = signal<RollMode>('normal');
  protected readonly rolling = signal(false);
  protected readonly display = signal(20);
  protected readonly result = signal<RollResult | null>(null);
  protected readonly history = signal<readonly RollResult[]>([]);

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  protected selectDie(d: number): void {
    if (this.rolling()) return;
    this.die.set(d);
    this.display.set(d);
    this.result.set(null);
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
    const die = this.die();
    const mode = this.mode();
    this.rolling.set(true);
    this.result.set(null);

    // Tumble: flash random faces for a beat, then settle on the real roll.
    const start = Date.now();
    this.timer = setInterval(() => {
      this.display.set(this.rollRaw(die));
      if (Date.now() - start >= 650) this.settle(die, mode);
    }, 55);
  }

  private settle(die: number, mode: RollMode): void {
    this.clearTimer();
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
    const modifier = this.modifier();
    const result: RollResult = {
      die,
      rolls,
      picked,
      modifier,
      total: picked + modifier,
      mode,
    };
    this.display.set(picked);
    this.result.set(result);
    this.history.update(h => [result, ...h].slice(0, 6));
    this.rolling.set(false);
  }

  private rollRaw(die: number): number {
    return Math.floor(Math.random() * die) + 1;
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  protected modLabel(m: number): string {
    if (m === 0) return '';
    return m > 0 ? ` + ${m}` : ` − ${Math.abs(m)}`;
  }
}
