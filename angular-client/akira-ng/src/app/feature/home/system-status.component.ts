import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';

type Status = 'checking' | 'up' | 'down';

interface ServiceCheck {
  readonly key: string;
  readonly label: string;
  /** Same-origin, permit-all GET that returns 200 when the service is up. */
  readonly url: string;
  readonly status: Status;
}

/**
 * Live availability of the moving parts behind Akira. Each row pings a
 * same-origin, public endpoint with native `fetch` (so the global HTTP error
 * interceptor doesn't toast on the failures we expect) and shows a dot:
 * green = up, red = unavailable, amber = checking. Re-checks every 30s.
 *
 * Endpoints are reachable without auth: the backends' list endpoints are
 * permit-all, and the remote entry is a static file — a 200 means "alive".
 */
@Component({
  selector: 'app-system-status',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './system-status.component.html',
})
export class SystemStatusComponent implements OnInit, OnDestroy {
  protected readonly services = signal<readonly ServiceCheck[]>([
    { key: 'akira-api', label: 'Akira backend', url: '/bff/api/tag', status: 'checking' },
    { key: 'ooze-api', label: 'Oozengine backend', url: '/bff/ooz/spell', status: 'checking' },
    { key: 'ooze-mfe', label: 'Oozengine frontend', url: '/remotes/ooze/remoteEntry.json', status: 'checking' },
  ]);
  protected readonly lastChecked = signal<Date | null>(null);
  protected readonly checking = computed(() => this.services().some(s => s.status === 'checking'));

  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    void this.checkAll();
    this.timer = setInterval(() => void this.checkAll(), 30_000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  protected refresh(): void {
    this.services.update(list => list.map(s => ({ ...s, status: 'checking' as Status })));
    void this.checkAll();
  }

  protected statusLabel(status: Status): string {
    return status === 'up' ? 'Operational' : status === 'down' ? 'Unavailable' : 'Checking…';
  }

  protected dotClass(status: Status): string {
    return status === 'up' ? 'bg-success' : status === 'down' ? 'bg-danger' : 'bg-fg-subtle';
  }

  protected textClass(status: Status): string {
    return status === 'up' ? 'text-success' : status === 'down' ? 'text-danger' : 'text-fg-subtle';
  }

  private async checkAll(): Promise<void> {
    await Promise.all(this.services().map(s => this.probe(s.key, s.url)));
    this.lastChecked.set(new Date());
  }

  private async probe(key: string, url: string): Promise<void> {
    const ok = await this.ping(url);
    this.services.update(list =>
      list.map(s => (s.key === key ? { ...s, status: ok ? 'up' : 'down' } : s)),
    );
  }

  private async ping(url: string): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
        signal: controller.signal,
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}
