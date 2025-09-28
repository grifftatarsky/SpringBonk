import { AsyncPipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthenticationComponent } from './auth/authentication.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MenuNavigationComponent } from './common/menu-navigation.component';
import { MatButtonModule } from '@angular/material/button';
import { map, Observable } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { UserService } from './service/user.service';
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
})
export class AppComponent {
  readonly isAuthenticated$: Observable<boolean>;

  constructor(private readonly user: UserService) {
    this.isAuthenticated$ = this.user.valueChanges.pipe(
      map((user: User): boolean => user.isAuthenticated)
    );
  }
}
