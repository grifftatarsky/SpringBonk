import {
  ChangeDetectionStrategy,
  Component,
  inject,
  isDevMode,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ShellAuthService } from '../shell/shell-auth.service';
import { DiceRoller } from '../dice/dice-roller';

type ToolStatus = 'available' | 'progress' | 'planned';

interface DmTool {
  readonly title: string;
  readonly description: string;
  readonly status: ToolStatus;
  /** Single SVG path (24×24, stroked) for the tool glyph. */
  readonly iconPath: string;
}

@Component({
  selector: 'ooze-dashboard',
  imports: [AsyncPipe, DiceRoller],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ooze-dashboard.html',
})
export class OozeDashboard {
  private readonly shellAuth = inject(ShellAuthService);

  /** Shared Keycloak user, streamed from the shell when federated. */
  protected readonly user$ = this.shellAuth.user$;

  /**
   * Dev-only federation call-out. `isDevMode()` is false in a production build,
   * so it's stripped from the built site.
   */
  protected readonly showFederationBadge = isDevMode();

  /** DM tools, reflecting what the ooze backend supports today + the roadmap. */
  protected readonly tools: readonly DmTool[] = [
    { title: 'Spells', description: 'The grimoire, by level and school of magic.', status: 'available', iconPath: 'M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7z' },
    { title: 'Items & gear', description: 'Weapons, armor, and adventuring equipment.', status: 'available', iconPath: 'M5 8h14v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM9 8a3 3 0 0 1 6 0' },
    { title: 'Backgrounds', description: 'Origins, proficiencies, and starting feats.', status: 'available', iconPath: 'M6.5 4h11v16h-11zM9 9h6M9 13h6' },
    { title: 'Species', description: 'Ancestries and their traits.', status: 'progress', iconPath: 'M5 19c0-7 5-13 14-14 1 9-5 15-14 14zM8 16l8-8' },
    { title: 'Classes', description: 'Vocations, subclasses, and features.', status: 'progress', iconPath: 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z' },
    { title: 'Characters', description: 'Player characters and sheets.', status: 'planned', iconPath: 'M8.5 8a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6' },
    { title: 'Bestiary', description: 'Monsters, statblocks, and lore.', status: 'planned', iconPath: 'M7 4c1.2 5 1.2 11 0 16M12 4c1.2 5 1.2 11 0 16M17 4c1.2 5 1.2 11 0 16' },
    { title: 'Encounters', description: 'Build and balance combat by challenge rating.', status: 'planned', iconPath: 'M4 4l16 16M20 4 4 20' },
  ];

  protected statusLabel(status: ToolStatus): string {
    return status === 'available'
      ? 'Available'
      : status === 'progress'
        ? 'In progress'
        : 'Planned';
  }

  protected statusClass(status: ToolStatus): string {
    return status === 'available'
      ? 'border-success/30 bg-success-subtle text-success'
      : status === 'progress'
        ? 'border-warn/30 bg-warn-subtle text-warn'
        : 'border-rule bg-bg-muted text-fg-subtle';
  }
}
