import { AsyncPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '../service/user.service';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { Observable } from 'rxjs';
import { User } from '../auth/user.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, NgIf, RouterLink, ButtonModule, CardModule],
  templateUrl: 'home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private userService: UserService = inject(UserService);
  readonly user$: Observable<User> = this.userService.valueChanges;
}
