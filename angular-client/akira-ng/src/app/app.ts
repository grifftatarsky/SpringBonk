import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Auth } from './auth/auth';
import { UserService } from './auth/user.service';
import { map, Observable } from 'rxjs';
import { User } from './auth/user.model';
import { ToastContainerComponent } from './common/notification/toast-container.component';

type NavLink = Readonly<{
  label: string;
  href: string;
  external?: boolean;
  accent?: boolean;
  ariaLabel?: string;
}>;

@Component({
  selector: 'app-root',
  imports: [
    NgOptimizedImage,
    RouterOutlet,
    Auth,
    ToastContainerComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // region DI

  private readonly userService: UserService = inject(UserService);

  // endregion

  // What do I do with this again...?
  protected readonly title: WritableSignal<string> = signal('Akira');
  readonly isAuthenticated$: Observable<boolean>;

  constructor() {
    this.isAuthenticated$ = this.userService.valueChanges.pipe(
      map((user: User): boolean => user.isAuthenticated),
    );
  }

  // region Mobile Menu

  protected readonly navLinks: readonly NavLink[] = [
    { label: 'Docs', href: '/docs' },
    { label: 'Blog', href: '/blog' },
    { label: 'Showcase', href: '/showcase' },
    { label: 'Profile', href: '/profile' },
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
