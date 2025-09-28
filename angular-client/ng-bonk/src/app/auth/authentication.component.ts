import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UserService } from '../service/user.service';
import { LoginComponent } from './login.component';
import { LogoutComponent } from './logout.component';
import { map, Observable } from 'rxjs';
import { User } from './user.model';

@Component({
  selector: 'app-authentication',
  standalone: true,
  imports: [CommonModule, LoginComponent, LogoutComponent],
  templateUrl: './authentication.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthenticationComponent {
  isAuthenticated$!: Observable<boolean>;

  constructor(private user: UserService) {
    this.isAuthenticated$ = this.user.valueChanges.pipe(
      map((u: User): boolean => u.isAuthenticated)
    );
  }
}
