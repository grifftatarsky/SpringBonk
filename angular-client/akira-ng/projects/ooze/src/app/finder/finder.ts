import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
  imports: [FinderMenuBar, ContentPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './finder.html',
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
  /** Auto-grant means any signed-in user is a DM over their own catalog. */
  protected readonly canEdit = computed(() => this.user()?.isAuthenticated ?? false);

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.all();
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

  protected readonly selected = computed(
    () => this.all().find(i => i.id === this.selectedId()) ?? null,
  );

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

  protected subtitle(i: CatalogItem): string {
    const d = this.openDef();
    return d?.subtitle ? d.subtitle(i) : '';
  }

  protected dotClass(i: CatalogItem): string {
    return i.overridesId ? 'bg-warn' : 'bg-success';
  }

  private loadItems(selectAfter: string | null): void {
    const def = this.openDef();
    if (!def) return;
    this.loading.set(true);
    this.loadError.set(false);
    this.content.list(def.apiPath).subscribe({
      next: list => {
        this.all.set(list);
        this.loading.set(false);
        this.selectedId.set(
          selectAfter && list.some(i => i.id === selectAfter) ? selectAfter : null,
        );
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }
}
