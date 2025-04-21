import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { AuthenticationComponent } from './auth/authentication.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MenuNavigationComponent } from './menu-navigation.component';
import { MatButtonModule } from '@angular/material/button';
import { filter, map, Observable, startWith } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';

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
    MenuNavigationComponent,
  ],
  templateUrl: './app.component.html',
  styles: [],
})
export class AppComponent {
  title$: Observable<string>;

  constructor(
    private router: Router,
    private route: ActivatedRoute
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
  }
}
