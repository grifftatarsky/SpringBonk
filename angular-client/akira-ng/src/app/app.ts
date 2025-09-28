import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  signal,
  WritableSignal,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterOutlet } from '@angular/router';

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
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly title: WritableSignal<string> = signal('Akira');

  protected readonly navLinks: readonly NavLink[] = [
    { label: 'Docs', href: '/docs' },
    { label: 'Blog', href: '/blog' },
    { label: 'Showcase', href: '/showcase' },
    { label: 'Sponsor', href: '/sponsor' },
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
}
