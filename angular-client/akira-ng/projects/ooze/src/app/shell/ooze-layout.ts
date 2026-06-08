import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  signal,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DiceRoller } from '../dice/dice-roller';

@Component({
  selector: 'ooze-layout',
  imports: [RouterOutlet, DiceRoller],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ooze-layout.html',
  styleUrl: './ooze-layout.css',
})
export class OozeLayout {
  protected readonly panelId = 'ooze-dice-panel';
  protected readonly open = signal(this.initialOpen());

  protected toggle(): void {
    this.open.update(o => !o);
  }

  protected close(): void {
    if (this.open()) this.open.set(false);
  }

  @HostListener('window:keydown.escape')
  protected onEscape(): void {
    this.close();
  }

  /** Open by default on desktop widths; collapsed to the spine on mobile. */
  private initialOpen(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 1024px)').matches
    );
  }
}
