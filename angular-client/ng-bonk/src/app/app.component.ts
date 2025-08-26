import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { AuthenticationComponent } from './auth/authentication.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MenuNavigationComponent } from './common/menu-navigation.component';
import { MatButtonModule } from '@angular/material/button';
import { filter, map, Observable, startWith } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { UserService } from './service/user.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    AuthenticationComponent,
    MatToolbarModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MenuNavigationComponent,
  ],
  templateUrl: './app.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('routeFadeAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0 })),
      ]),
    ]),
  ],
})
export class AppComponent {
  title$: Observable<string>;
  isAuthenticated$: Observable<boolean>;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private user: UserService
  ) {
    this.title$ = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let child: ActivatedRoute | null = this.route.firstChild;
        while (child?.firstChild) child = child.firstChild;
        return child?.snapshot.data['title'] || 'Unknown';
      })
    );

    this.isAuthenticated$ = this.user.valueChanges.pipe(
      map(user => user.isAuthenticated)
    );
  }
}
