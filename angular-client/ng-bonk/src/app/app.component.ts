import { AsyncPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { filter, map, Observable, shareReplay, startWith } from 'rxjs';
import { AuthenticationComponent } from './auth/authentication.component';
import { UserService } from './service/user.service';
import { User } from './auth/user.model';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { SidebarModule } from 'primeng/sidebar';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    RouterOutlet,
    RouterLink,
    AuthenticationComponent,
    ToolbarModule,
    ButtonModule,
    SidebarModule,
    MenuModule,
    ToastModule,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  menuVisible = false;

  readonly title$: Observable<string>;
  readonly menuItems$: Observable<MenuItem[]>;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly user: UserService
  ) {
    this.title$ = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.resolveTitle(this.route)),
      shareReplay({ refCount: true, bufferSize: 1 })
    );

    this.menuItems$ = this.user.valueChanges.pipe(
      map((current: User): MenuItem[] =>
        current.isAuthenticated
          ? this.buildAuthedMenu()
          : this.buildGuestMenu()
      ),
      shareReplay({ refCount: true, bufferSize: 1 })
    );
  }

  toggleMenu(): void {
    this.menuVisible = !this.menuVisible;
  }

  closeMenu(): void {
    this.menuVisible = false;
  }

  private resolveTitle(route: ActivatedRoute): string {
    let cursor: ActivatedRoute | null = route;
    while (cursor?.firstChild) {
      cursor = cursor.firstChild;
    }
    const raw: unknown = cursor?.snapshot.data['title'];
    if (typeof raw === 'string' && raw.trim().length) {
      return raw;
    }
    return 'Akira';
  }

  private buildAuthedMenu(): MenuItem[] {
    return [
      this.navItem('Home', 'pi pi-home', ['/']),
      this.navItem('About', 'pi pi-info-circle', ['/about']),
      this.navItem('My Elections', 'pi pi-chart-bar', ['/elections']),
      this.navItem('My Shelves', 'pi pi-book', ['/shelves']),
    ];
  }

  private buildGuestMenu(): MenuItem[] {
    return [
      this.navItem('Home', 'pi pi-home', ['/']),
      this.navItem('About', 'pi pi-info-circle', ['/about']),
    ];
  }

  private navItem(label: string, icon: string, routerLink: string[]): MenuItem {
    return {
      label,
      icon,
      routerLink,
      command: () => this.closeMenu(),
    };
  }
}
