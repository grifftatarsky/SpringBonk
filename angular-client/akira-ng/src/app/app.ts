import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  effect,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import { DOCUMENT, NgOptimizedImage } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Auth } from './auth/auth';
import { UserService } from './auth/user.service';
import { filter, map, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { User } from './auth/user.model';
import { ToastContainerComponent } from './common/notification/toast-container.component';
import { NotificationBellComponent } from './common/notification/notification-bell.component';

type NavLink = Readonly<{
  label: string;
  href: string;
  external?: boolean;
  accent?: boolean;
  ariaLabel?: string;
}>;

type ThemePreference = 'system' | 'light' | 'dark';

@Component({
  selector: 'app-root',
  imports: [
    NgOptimizedImage,
    RouterLink,
    RouterOutlet,
    Auth,
    ToastContainerComponent,
    NotificationBellComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // region DI

  private readonly userService: UserService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly titleService = inject(Title);
  private readonly mediaQuery: MediaQueryList | null =
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  private readonly handleSystemPreferenceChange = (event: MediaQueryListEvent): void => {
    this.systemPrefersDark.set(event.matches);
  };

  // endregion

  private readonly systemPrefersDark = signal(false);
  protected readonly themePreference = signal<ThemePreference>('system');
  protected readonly themeOptions: readonly { label: string; value: ThemePreference }[] = [
    { label: 'System', value: 'system' },
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
  ];

  readonly isAuthenticated$: Observable<boolean>;

  constructor() {
    this.isAuthenticated$ = this.userService.valueChanges.pipe(
      map((user: User): boolean => user.isAuthenticated),
    );
    this.initializeTheme();
    effect(() => {
      this.applyTheme(this.themePreference(), this.systemPrefersDark());
    });
    this.wireRouteTitles();
  }

  /**
   * Walks the activated route tree on every NavigationEnd and sets
   * `document.title` from the deepest route with a `data.title` entry.
   * All titles are suffixed with " · Akira".
   */
  private wireRouteTitles(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        let route = this.activatedRoute;
        while (route.firstChild) {
          route = route.firstChild;
        }
        const title = route.snapshot.data['title'] as string | undefined;
        this.titleService.setTitle(title ? `${title} · Akira` : 'Akira');
      });
  }

  protected setThemePreference(preference: ThemePreference): void {
    if (this.themePreference() === preference) {
      return;
    }
    this.themePreference.set(preference);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('akira-theme', preference);
    }
  }

  private initializeTheme(): void {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('akira-theme');
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        this.themePreference.set(stored);
      }
    }
    if (this.mediaQuery) {
      this.systemPrefersDark.set(this.mediaQuery.matches);
      this.mediaQuery.addEventListener('change', this.handleSystemPreferenceChange);
      this.destroyRef.onDestroy(() => {
        this.mediaQuery?.removeEventListener('change', this.handleSystemPreferenceChange);
      });
    }
    this.applyTheme(this.themePreference(), this.systemPrefersDark());
  }

  private applyTheme(preference: ThemePreference, systemPrefersDark: boolean): void {
    const root = this.document?.documentElement;
    if (!root) {
      return;
    }
    const useDarkTheme = preference === 'dark' || (preference === 'system' && systemPrefersDark);
    root.classList.toggle('dark', useDarkTheme);
  }

  // region Mobile Menu

  protected readonly navLinks: readonly NavLink[] = [
    { label: 'Docs', href: '/docs' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Shelves', href: '/shelves' },
    { label: 'Elections', href: '/elections' },
    {
      label: 'GitHub',
      href: 'https://github.com/grifftatarsky/SpringBonk',
      external: true,
      ariaLabel: 'GitHub repository',
    },
  ];
  protected readonly mobileMenuOpen: WritableSignal<boolean> = signal(false);
  protected readonly mobileMenuId: string = 'mobile-nav-panel';

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((isOpen: boolean): boolean => !isOpen);
  }

  protected closeMobileMenu(): void {
    if (this.mobileMenuOpen()) {
      this.mobileMenuOpen.set(false);
    }
  }

  @HostListener('window:keydown.escape')
  protected handleEscape(): void {
    this.closeMobileMenu();
  }

  // endregion
}
