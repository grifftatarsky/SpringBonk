import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ShellAuthService } from '../shell/shell-auth.service';
import { CONTENT_TYPES, CatalogItem, ContentTypeDef } from './ooze-content.models';
import { ContentService } from './content.service';
import { ContentPanel } from './content-panel';
import { FinderMenuBar } from './finder-menu-bar';

interface ItemGroup {
  readonly key: string | number;
  readonly label: string;
  readonly order: number;
  readonly items: CatalogItem[];
}

/**
 * Finder-style browser for catalog content, driven entirely by the
 * {@link ContentTypeDef}s: a menu bar, a grid of content "folders", and — once a
 * folder is opened — a list beside a detail/edit pane. Editing affordances show
 * only for a signed-in DM. Unimplemented folders are disabled with a hint.
 */
@Component({
  selector: 'ooze-finder',
  imports: [FinderMenuBar, ContentPanel, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './finder.html',
  styleUrl: './finder.css',
})
export class Finder {
  private readonly content = inject(ContentService);
  private readonly shellAuth = inject(ShellAuthService);

  protected readonly folders = CONTENT_TYPES;
  protected readonly openDef = signal<ContentTypeDef | null>(null);

  protected readonly all = signal<readonly CatalogItem[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadError = signal(false);
  protected readonly search = signal('');
  protected readonly selectedId = signal<string | null>(null);
  protected readonly creating = signal(false);

  private readonly user = toSignal(this.shellAuth.user$);
  /** Editing is gated on the DUNGEON_MASTER role; everyone else is read-only. */
  protected readonly canEdit = computed(() =>
    (this.user()?.roles ?? []).includes('DUNGEON_MASTER'),
  );
  protected readonly isAuthenticated = computed(() => this.user()?.isAuthenticated ?? false);

  /** mailto for logged-in users without the DM role to request access. */
  protected readonly requestAccessHref =
    'mailto:grifftatarsky@gmail.com' +
    '?subject=' +
    encodeURIComponent('Oozengine — Dungeon Master access request') +
    '&body=' +
    encodeURIComponent("Hey! I'm requesting access for Dungeon Master tools on Oozengine. Thanks!");

  /**
   * Whether to include SRD 5.1 rows. On by default — the 5.1 content we carry
   * is only what 5.2 has no equivalent of, so hiding it by default would hide
   * the reason it was imported. Remembered per browser; a blocked or empty
   * localStorage just means the default.
   */
  protected readonly showLegacy = signal(Finder.readShowLegacy());

  /** True once the open folder actually holds 5.1 rows — the toggle is hidden
   * otherwise rather than offering to filter a distinction that isn't there. */
  protected readonly hasLegacy = computed(() =>
    this.all().some(i => i.srdVersion === 'SRD_5_1'),
  );

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const legacy = this.showLegacy();
    let list = this.all();
    if (!legacy) list = list.filter(i => i.srdVersion !== 'SRD_5_1');
    return q ? list.filter(i => i.name.toLowerCase().includes(q)) : list;
  });

  protected readonly groups = computed<ItemGroup[]>(() => {
    const def = this.openDef();
    const list = this.filtered();
    if (!def?.group) {
      return list.length ? [{ key: '_', label: '', order: 0, items: [...list] }] : [];
    }
    const map = new Map<string | number, ItemGroup>();
    for (const it of list) {
      const g = def.group(it);
      const existing = map.get(g.key);
      if (existing) existing.items.push(it);
      else map.set(g.key, { key: g.key, label: g.label, order: g.order, items: [it] });
    }
    return [...map.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  });

  /**
   * The open entry, in full. List rows can be summaries, so the detail is
   * fetched on selection and cached per id — reopening one is free, and the
   * list payload stays small however big the catalog gets.
   */
  private readonly detailCache = signal<Record<string, CatalogItem>>({});

  protected readonly selected = computed(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.detailCache()[id] ?? this.all().find(i => i.id === id) ?? null;
  });

  /** On mobile the detail is a bottom sheet shown only when something's open. */
  protected readonly detailOpen = computed(() => this.selected() !== null || this.creating());

  // Swipe-to-dismiss state for the mobile bottom sheet.
  protected readonly dragY = signal(0);
  protected readonly dragging = signal(false);
  protected readonly sheetTransform = computed(() => `translateY(${this.dragY()}px)`);
  private dragStartY = 0;

  protected open(def: ContentTypeDef): void {
    if (!def.implemented) return;
    this.openDef.set(def);
    this.search.set('');
    this.creating.set(false);
    this.loadItems(null);
  }

  protected back(): void {
    this.openDef.set(null);
    this.selectedId.set(null);
    this.creating.set(false);
  }

  protected select(i: CatalogItem): void {
    this.creating.set(false);
    this.selectedId.set(i.id);
    this.loadDetail(i.id);
  }

  private loadDetail(id: string): void {
    const def = this.openDef();
    if (!def || this.detailCache()[id]) return;
    this.content.get(def.apiPath, id).subscribe({
      next: full => this.detailCache.update(c => ({ ...c, [id]: full })),
      // The summary from the list is already showing; a failed detail fetch
      // leaves it in place rather than blanking the pane.
      error: () => undefined,
    });
  }

  protected startCreate(): void {
    this.selectedId.set(null);
    this.creating.set(true);
  }

  protected onChanged(id: string | null): void {
    this.creating.set(false);
    this.loadItems(id);
  }

  protected onCloseCreate(): void {
    this.creating.set(false);
  }

  /** Close the mobile bottom sheet (back to the list). */
  protected closeDetail(): void {
    this.selectedId.set(null);
    this.creating.set(false);
    this.dragY.set(0);
    this.dragging.set(false);
  }

  protected onDragStart(event: TouchEvent): void {
    this.dragStartY = event.touches[0]?.clientY ?? 0;
    this.dragging.set(true);
  }

  protected onDragMove(event: TouchEvent): void {
    const y = event.touches[0]?.clientY ?? this.dragStartY;
    this.dragY.set(Math.max(0, y - this.dragStartY));
  }

  protected onDragEnd(): void {
    this.dragging.set(false);
    if (this.dragY() > 120) {
      this.closeDetail();
    } else {
      this.dragY.set(0);
    }
  }

  protected subtitle(i: CatalogItem): string {
    const d = this.openDef();
    return d?.subtitle ? d.subtitle(i) : '';
  }

  protected dotClass(i: CatalogItem): string {
    return i.overridesId ? 'bg-warn' : 'bg-success';
  }

  protected toggleLegacy(): void {
    const next = !this.showLegacy();
    this.showLegacy.set(next);
    // Deselecting matters: hiding 5.1 while a 5.1 row is open would otherwise
    // leave the detail pane showing something the list no longer offers.
    if (!next && this.selected()?.srdVersion === 'SRD_5_1') this.selectedId.set(null);
    try {
      localStorage.setItem(Finder.LEGACY_KEY, next ? 'on' : 'off');
    } catch {
      // Private windows and blocked site data throw on write; the toggle still
      // works for this session, it just won't be remembered.
    }
  }

  private static readonly LEGACY_KEY = 'ooze.showLegacySrd';

  private static readShowLegacy(): boolean {
    try {
      return localStorage.getItem(Finder.LEGACY_KEY) !== 'off';
    } catch {
      return true;
    }
  }

  private loadItems(selectAfter: string | null): void {
    const def = this.openDef();
    if (!def) return;
    this.loading.set(true);
    this.loadError.set(false);
    this.content.list(def.apiPath).subscribe({
      next: list => {
        this.all.set(list);
        this.detailCache.set({});
        this.loading.set(false);
        const reselect = selectAfter && list.some(i => i.id === selectAfter) ? selectAfter : null;
        this.selectedId.set(reselect);
        if (reselect) this.loadDetail(reselect);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }
}
