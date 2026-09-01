import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Globe } from '../map/globe';
import type { GlobeClick } from '../map/globe';
import { DEFAULT_BASEMAP, basemapTone } from '../map/basemap';
import { defaultVisibility } from '../map/layer-groups';
import type { GroupVisibility, LayerGroupId } from '../map/layer-groups';
import { REDUCED_MOTION } from '../map/motion';
import { stickerLayers } from '../map/sticker-layers';
import { StickerSidebar } from '../stickers/sticker-sidebar';
import { StickerComposer } from '../stickers/sticker-composer';
import { StickerService, describe } from '../stickers/sticker.service';
import type { Coordinate, Sticker } from '../stickers/sticker.models';
import { MenuBar } from './menu-bar';

/**
 * Where the camera lands when a sticker is opened — close enough to read the
 * street it was taken on, which is the whole reason opening one moves the map.
 */
const STREET_ZOOM = 16;

/** Zoom used when the composer is aimed somewhere; near enough to place precisely. */
const PLACE_ZOOM = 9;

/** Width of the sidebar on desktop, matched to jpss-page.css. */
const SIDEBAR_WIDTH = 380;

/** Below this the sidebar is a bottom sheet, so the camera offset goes vertical. */
const SIDEBAR_BREAKPOINT = 768;

interface Toast {
  readonly tone: 'info' | 'error';
  readonly message: string;
}

/**
 * The whole application: a globe with stickers on it, one menu, and a sidebar.
 *
 * Nothing here navigates. Opening a sticker flies the camera down to it and
 * slides the sidebar in; dismissing it hands the camera back to the spin, which
 * pulls out to the whole earth on its own. Routing away would throw away the
 * camera, and the camera is where you were.
 */
@Component({
  selector: 'jpss-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Globe, MenuBar, StickerSidebar, StickerComposer],
  templateUrl: './jpss-page.html',
  styleUrl: './jpss-page.css',
})
export class JpssPage {
  protected readonly stickers = inject(StickerService);
  private readonly globe = viewChild.required(Globe);

  // region map state

  protected readonly basemap = signal(DEFAULT_BASEMAP);
  protected readonly visibility = signal<GroupVisibility>(defaultVisibility());
  protected readonly groupSizes = signal<Partial<Record<LayerGroupId, number>>>({});
  protected readonly mapLoading = signal(true);
  /**
   * Turning on arrival, because the first thing this app has to say is "there is
   * a globe and there are stickers on it" — and it stops the moment anyone
   * reaches for the map. Off from the start when the viewer asked for less motion.
   */
  protected readonly spinning = signal(!REDUCED_MOTION);

  // endregion

  // region wall state

  protected readonly selectedId = signal<string | null>(null);
  protected readonly hoveredId = signal<string | null>(null);
  /** Null when closed; a sticker when editing; 'new' when placing. */
  protected readonly composer = signal<Sticker | 'new' | null>(null);
  /** Where the composer's sticker will land. Held here because the globe sets it. */
  protected readonly pending = signal<Coordinate | null>(null);
  protected readonly picking = signal(false);
  protected readonly toast = signal<Toast | null>(null);

  private toastTimer = 0;

  // endregion

  protected readonly count = computed(() => this.stickers.stickers().length);
  protected readonly username = computed(() => this.stickers.currentUser()?.username ?? null);
  protected readonly composing = computed(() => this.composer() !== null);
  protected readonly editing = computed(() => {
    const open = this.composer();
    return open === null || open === 'new' ? null : open;
  });

  protected readonly selected = computed(() => {
    const id = this.selectedId();
    return id === null ? null : (this.stickers.stickers().find(s => s.id === id) ?? null);
  });

  protected readonly hovered = computed(() => {
    const id = this.hoveredId();
    return id === null ? null : (this.stickers.stickers().find(s => s.id === id) ?? null);
  });

  /** Whether the sidebar column is showing anything, so the stage can shift for it. */
  protected readonly sidebarOpen = computed(() => this.composing() || this.selected() !== null);

  private readonly ownedIds = computed(() => new Set(this.stickers.mine().map(s => s.id)));

  protected readonly layers = computed(() =>
    stickerLayers({
      stickers: this.stickers.stickers(),
      selectedId: this.selectedId(),
      hoveredId: this.hoveredId(),
      ownedIds: this.ownedIds(),
      tone: basemapTone(this.basemap()),
      // Only while the composer is actually waiting for one — a leftover marker
      // on a closed form is a spot nobody picked.
      pending: this.composing() ? this.pending() : null,
      onHover: sticker => this.hoveredId.set(sticker?.id ?? null),
    }),
  );

  constructor() {
    void this.stickers.load();
    void this.stickers.loadMe();

    // A signed-out user has nothing to compose with. Covers the session expiring
    // under an open form as well as the sign-out button.
    effect(() => {
      if (!this.stickers.signedIn() && this.stickers.authChecked() && this.composing()) {
        this.closeComposer();
      }
    });
  }

  // region map

  protected toggleSpin(): void {
    this.spinning.update(spinning => !spinning);
  }

  protected toggleGroup(group: LayerGroupId): void {
    this.visibility.update(current => ({ ...current, [group]: !current[group] }));
  }

  /**
   * One handler for everything a click on the globe can mean.
   *
   * Placing a spot wins while the composer is waiting for one, even when the
   * click lands on an existing sticker — the crosshair has already promised
   * that, and stickers cluster exactly where people want to add more.
   */
  protected onGlobeClick(event: GlobeClick): void {
    if (this.picking()) {
      this.pending.set({ longitude: event.longitude, latitude: event.latitude });
      this.picking.set(false);
      return;
    }

    const sticker = event.picked as Sticker | null;
    if (sticker) {
      this.open(sticker);
      return;
    }
    // A click on bare map with a sticker open means "put it away" — so the
    // camera comes back out and the globe starts turning again.
    if (this.selected()) this.dismiss();
  }

  /** Opens a sticker: sidebar in, spin off, camera down to the street. */
  protected open(sticker: Sticker): void {
    this.spinning.set(false);
    this.selectedId.set(sticker.id);
    this.globe().flyTo({
      kind: 'center',
      longitude: sticker.longitude,
      latitude: sticker.latitude,
      zoom: STREET_ZOOM,
      offset: this.sidebarOffset(),
    });
  }

  /**
   * Closes the sidebar and hands the camera back to the spin, which eases out to
   * the whole earth by itself — the same pull-back it does on arrival, so
   * leaving a sticker and landing on the page look like the same motion.
   */
  protected dismiss(): void {
    this.selectedId.set(null);
    this.spinning.set(true);
  }

  /**
   * Keeps the point the camera flies to inside the half of the stage the sidebar
   * is not covering. MapLibre reads this as a pixel offset from centre, so on a
   * phone — where the sidebar is a bottom sheet — it has to move up instead of
   * across.
   */
  private sidebarOffset(): [number, number] {
    if (typeof window === 'undefined') return [0, 0];
    return window.innerWidth < SIDEBAR_BREAKPOINT
      ? [0, -Math.round(window.innerHeight * 0.18)]
      : [-SIDEBAR_WIDTH / 2, 0];
  }

  // endregion

  // region composer

  protected startNew(): void {
    this.spinning.set(false);
    this.selectedId.set(null);
    this.pending.set(null);
    this.composer.set('new');
    // Straight into pick mode: a new sticker needs a spot before anything else
    // about it matters, and this saves the extra click on "Pick on map".
    this.picking.set(true);
  }

  protected startEdit(sticker: Sticker): void {
    this.composer.set(sticker);
    this.pending.set({ longitude: sticker.longitude, latitude: sticker.latitude });
    this.picking.set(false);
  }

  protected closeComposer(): void {
    this.composer.set(null);
    this.pending.set(null);
    this.picking.set(false);
  }

  protected onLocate(spot: Coordinate): void {
    this.pending.set(spot);
    this.picking.set(false);
    this.globe().flyTo({ kind: 'center', ...spot, zoom: PLACE_ZOOM, offset: this.sidebarOffset() });
  }

  protected onSaved(sticker: Sticker): void {
    const wasNew = this.composer() === 'new';
    this.closeComposer();
    this.open(sticker);
    this.notify('info', wasNew ? 'Sticker placed.' : 'Sticker updated.');
  }

  protected async onRemove(sticker: Sticker): Promise<void> {
    try {
      await this.stickers.remove(sticker.id);
      this.dismiss();
      this.notify('info', 'Sticker deleted.');
    } catch (error) {
      this.notify('error', describe(error, 'That sticker could not be deleted'));
    }
  }

  // endregion

  // region session

  protected async signIn(): Promise<void> {
    try {
      await this.stickers.login();
    } catch (error) {
      this.notify('error', describe(error, 'Sign-in is unavailable right now'));
    }
  }

  protected async signOut(): Promise<void> {
    this.closeComposer();
    try {
      await this.stickers.logout();
    } catch (error) {
      this.notify('error', describe(error, 'Sign-out did not complete'));
    }
  }

  // endregion

  private notify(tone: Toast['tone'], message: string): void {
    window.clearTimeout(this.toastTimer);
    this.toast.set({ tone, message });
    // Errors stay put; a confirmation has said its piece after a few seconds.
    if (tone === 'info') {
      this.toastTimer = window.setTimeout(() => this.toast.set(null), 4000);
    }
  }
}
