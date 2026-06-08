import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Status, SystemStatusService } from '../../common/system-status.service';

/**
 * Home-page view over {@link SystemStatusService}: a dot per service
 * (green = up, red = unavailable, amber = checking) and, when Oozengine is
 * down, a warning strip flush to the bottom of the box.
 */
@Component({
  selector: 'app-system-status',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './system-status.component.html',
})
export class SystemStatusComponent {
  protected readonly status = inject(SystemStatusService);

  protected statusLabel(status: Status): string {
    return status === 'up' ? 'Operational' : status === 'down' ? 'Unavailable' : 'Checking…';
  }

  protected dotClass(status: Status): string {
    return status === 'up' ? 'bg-success' : status === 'down' ? 'bg-danger' : 'bg-fg-subtle';
  }

  protected textClass(status: Status): string {
    return status === 'up' ? 'text-success' : status === 'down' ? 'text-danger' : 'text-fg-subtle';
  }
}
