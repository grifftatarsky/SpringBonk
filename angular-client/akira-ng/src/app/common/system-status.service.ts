import { Injectable, computed, signal } from '@angular/core';

export type Status = 'checking' | 'up' | 'down';

export interface ServiceCheck {
  readonly key: string;
  readonly label: string;
  /** Same-origin, permit-all GET that returns 200 when the service is up. */
  readonly url: string;
  readonly status: Status;
}

/**
 * Shared liveness of Akira's moving parts. Pings same-origin, public endpoints
 * with native `fetch` (so the global HTTP error interceptor doesn't toast on the
 * failures we expect), re-checking every 30s. One instance feeds the home
 * status box, the home Oozengine hero, and the nav availability state.
 *
 * Oozengine counts as "available" only when both its backend and its federated
 * micro-frontend answer — either being down marks it unavailable.
 */
@Injectable({ providedIn: 'root' })
export class SystemStatusService {
  private readonly state = signal<readonly ServiceCheck[]>([
    { key: 'akira-api', label: 'Akira backend', url: '/bff/api/tag', status: 'checking' },
    { key: 'ooze-api', label: 'Oozengine backend', url: '/bff/ooz/spell', status: 'checking' },
    { key: 'ooze-mfe', label: 'Oozengine frontend', url: '/remotes/ooze/remoteEntry.json', status: 'checking' },
  ]);

  readonly services = this.state.asReadonly();
  readonly lastChecked = signal<Date | null>(null);
  readonly checking = computed(() => this.state().some(s => s.status === 'checking'));

  /** Both Oozengine pieces up. */
  readonly oozeAvailable = computed(
    () => this.statusOf('ooze-api') === 'up' && this.statusOf('ooze-mfe') === 'up',
  );

  /** Either Oozengine piece confirmed down (not merely still checking). */
  readonly oozeDown = computed(
    () => this.statusOf('ooze-api') === 'down' || this.statusOf('ooze-mfe') === 'down',
  );

  constructor() {
    void this.checkAll();
    setInterval(() => void this.checkAll(), 30_000);
  }

  refresh(): void {
    this.state.update(list => list.map(s => ({ ...s, status: 'checking' as Status })));
    void this.checkAll();
  }

  private statusOf(key: string): Status | undefined {
    return this.state().find(s => s.key === key)?.status;
  }

  private async checkAll(): Promise<void> {
    await Promise.all(this.state().map(s => this.probe(s.key, s.url)));
    this.lastChecked.set(new Date());
  }

  private async probe(key: string, url: string): Promise<void> {
    const ok = await this.ping(url);
    this.state.update(list =>
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
