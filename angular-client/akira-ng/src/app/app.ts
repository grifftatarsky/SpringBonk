import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  signal,
  WritableSignal,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

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
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly title: WritableSignal<string> = signal('akira-ng');
  protected readonly navLinks: readonly NavLink[] = [
    { label: 'Docs', href: '/docs' },
    { label: 'Blog', href: '/blog' },
    { label: 'Showcase', href: '/showcase' },
    { label: 'Sponsor', href: '/sponsor' },
    { label: 'Plus', href: '/plus?ref=top', accent: true },
    {
      label: 'GitHub',
      href: 'https://github.com/tailwindlabs/tailwindcss',
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
}
