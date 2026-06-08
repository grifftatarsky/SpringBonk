import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  signal,
} from '@angular/core';
import { OozeTooltip } from './ooze-tooltip';

interface MenuFeature {
  readonly label: string;
  readonly iconPath: string;
}

/**
 * The Finder's menu bar — quick links to other DM tools. They're all
 * unimplemented for now, so each is disabled with a "coming soon" tooltip. On
 * narrow screens the row collapses into a single "Tools" dropdown.
 */
@Component({
  selector: 'ooze-finder-menu-bar',
  imports: [OozeTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './finder-menu-bar.html',
})
export class FinderMenuBar {
  protected readonly features: readonly MenuFeature[] = [
    { label: 'Combat simulator', iconPath: 'M14.5 3.5 21 10l-2 2-6.5-6.5zM3 21l6-6M9 9l-6 6 3 3 6-6' },
    { label: 'Map builder', iconPath: 'M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2zM9 3v16M15 5v16' },
    { label: 'Encounter builder', iconPath: 'M3 6h18M3 12h18M3 18h18' },
    { label: 'Initiative tracker', iconPath: 'M12 6v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z' },
    { label: 'Loot generator', iconPath: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  ];

  protected readonly menuOpen = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update(o => !o);
  }

  @HostListener('document:keydown.escape')
  protected close(): void {
    if (this.menuOpen()) this.menuOpen.set(false);
  }
}
