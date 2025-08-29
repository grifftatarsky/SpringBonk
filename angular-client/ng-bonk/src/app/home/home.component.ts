import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '../service/user.service';
import { MatButtonModule } from '@angular/material/button';
import { Observable } from 'rxjs';
import { User } from '../auth/user.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, RouterLink, MatButtonModule],
  templateUrl: 'home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private userService: UserService = inject(UserService);
  readonly user$: Observable<User> = this.userService.valueChanges;
}
