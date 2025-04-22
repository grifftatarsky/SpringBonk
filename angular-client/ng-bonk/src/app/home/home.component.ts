import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { UserService } from '../service/user.service';
import { User } from '../auth/user.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: 'home.component.html',
  styles: [],
})
export class HomeComponent implements OnDestroy {
  message: string = '';

  private userSubscription?: Subscription;

  constructor(user: UserService) {
    this.userSubscription = user.valueChanges.subscribe((u: User): void => {
      this.message = u.isAuthenticated
        ? `Hi ${u.name}, you are granted with ${HomeComponent.rolesStr(u)}.`
        : 'You are not authenticated.';
    });
  }

  static rolesStr(user: User): string {
    if (!user?.roles?.length) {
      return '[]';
    }
    return `["${user.roles.join('", "')}"]`;
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }
}
