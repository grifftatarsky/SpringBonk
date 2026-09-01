import { Injectable, computed, signal } from '@angular/core';

export type Status = 'checking' | 'up' | 'down';

export interface ServiceCheck {
  readonly key: string;
  readonly label: string;
  /** Same-origin, permit-all GET that returns 200 when the service is up. */
  readonly url: string;
  readonly status: Status;
  /** When set, this is a game frontend nested under a backend (e.g. Decks). */
  readonly parentKey?: string;
}

/** A top-level service plus any frontends served under it. */
export interface ServiceGroup {
  readonly service: ServiceCheck;
  readonly subs: readonly ServiceCheck[];
}

@Injectable({ providedIn: 'root' })
export class SystemStatusService {
  private readonly state = signal<readonly ServiceCheck[]>([
    { key: 'akira-api', label: 'Akira backend', url: '/bff/api/tag', status: 'checking' },
    { key: 'ooze-api', label: 'Oozengine backend', url: '/bff/ooz/spell', status: 'checking' },
    { key: 'ooze-mfe', label: 'Oozengine frontend', url: '/remotes/ooze/remoteEntry.json', status: 'checking' },
    // The Decks backend (spring-decks) hosts several card-game frontends; each
    // game's micro-frontend is a sub-entry under it.
    { key: 'decks-api', label: 'Decks backend', url: '/bff/dck/games/open', status: 'checking' },
    { key: 'president-mfe', label: 'President', url: '/remotes/president/remoteEntry.json', status: 'checking', parentKey: 'decks-api' },
    { key: 'jpss-api', label: 'Stickers backend', url: '/bff/jps/stickers', status: 'checking' },
    { key: 'jpss-mfe', label: 'Stickers frontend', url: '/remotes/jpss-ui/remoteEntry.json', status: 'checking' },
  ]);

  readonly services = this.state.asReadonly();
  readonly lastChecked = signal<Date | null>(null);
  readonly checking = computed(() => this.state().some(s => s.status === 'checking'));

  /** Top-level services with their nested frontends, for the status panel. */
  readonly groups = computed<readonly ServiceGroup[]>(() => {
    const all = this.state();
    return all
      .filter(s => !s.parentKey)
      .map(service => ({ service, subs: all.filter(s => s.parentKey === service.key) }));
  });

  /** Both Oozengine pieces up. */
  readonly oozeAvailable = computed(
    () => this.statusOf('ooze-api') === 'up' && this.statusOf('ooze-mfe') === 'up',
  );

  /** Either Oozengine piece confirmed down (not merely still checking). */
  readonly oozeDown = computed(
    () => this.statusOf('ooze-api') === 'down' || this.statusOf('ooze-mfe') === 'down',
  );

  /** President up = the shared Decks backend AND President's frontend both up. */
  readonly presidentAvailable = computed(
    () => this.statusOf('decks-api') === 'up' && this.statusOf('president-mfe') === 'up',
  );

  /** Either piece confirmed down (the Decks backend, shared by all games, or President's frontend). */
  readonly presidentDown = computed(
    () => this.statusOf('decks-api') === 'down' || this.statusOf('president-mfe') === 'down',
  );

  /** Both sticker pieces up. */
  readonly jpssAvailable = computed(
    () => this.statusOf('jpss-api') === 'up' && this.statusOf('jpss-mfe') === 'up',
  );

  /** Either sticker piece confirmed down (not merely still checking). */
  readonly jpssDown = computed(
    () => this.statusOf('jpss-api') === 'down' || this.statusOf('jpss-mfe') === 'down',
  );

  /**
   * Federated apps confirmed down, by display name — what the home page's
   * warning strip reads from. Derived rather than hand-maintained per app, so
   * adding a remote to the checks above is enough to make it show up here.
   */
  readonly downApps = computed<readonly string[]>(() => {
    const down: string[] = [];
    if (this.oozeDown()) down.push('Oozengine');
    if (this.presidentDown()) down.push('President');
    if (this.jpssDown()) down.push('Jo Peace Stickers');
    return down;
  });

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
