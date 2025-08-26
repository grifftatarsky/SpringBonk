import { AsyncPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '../service/user.service';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, NgIf, RouterLink, MatButtonModule],
  templateUrl: 'home.component.html',
  styles: [
    `
      .home-container {
        padding: 2rem;
        text-align: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private user = inject(UserService);
  readonly user$ = this.user.valueChanges;
}
