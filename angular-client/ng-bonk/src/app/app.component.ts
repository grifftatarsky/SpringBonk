import { AsyncPipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet, } from '@angular/router';
import { AuthenticationComponent } from './auth/authentication.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MenuNavigationComponent } from './common/menu-navigation.component';
import { MatButtonModule } from '@angular/material/button';
import { filter, map, Observable, startWith } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { UserService } from './service/user.service';
import { animate, style, transition, trigger, type AnimationTriggerMetadata } from '@angular/animations';
import { User } from './auth/user.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AsyncPipe,
    NgOptimizedImage,
    RouterOutlet,
    RouterLink,
    AuthenticationComponent,
    MatToolbarModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MenuNavigationComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [routeFadeAnimation()],
})
export class AppComponent {
  readonly title$: Observable<string>;
  readonly isAuthenticated$: Observable<boolean>;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly user: UserService
  ) {
    this.title$ = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let child: ActivatedRoute | null = this.route.firstChild;
        while (child?.firstChild) child = child.firstChild;
        const title: unknown = child?.snapshot.data['title'];
        return typeof title === 'string' && title.trim().length > 0 ? title : 'Unknown';
      })
    );

    this.isAuthenticated$ = this.user.valueChanges.pipe(
      map((user: User): boolean => user.isAuthenticated)
    );
  }
}

function routeFadeAnimation(): AnimationTriggerMetadata {
  return trigger('routeFadeAnimation', [
    transition(':enter', [
      style({ opacity: 0 }),
      animate('300ms ease-out', style({ opacity: 1 })),
    ]),
    transition(':leave', [
      animate('300ms ease-in', style({ opacity: 0 })),
    ]),
  ]);
}
