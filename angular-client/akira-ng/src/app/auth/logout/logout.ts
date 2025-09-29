import { Component, inject } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../user.service';
import { UserHttpService } from '../../common/http/user-http.service';

@Component({
  selector: 'app-logout',
  imports: [],
  templateUrl: './logout.html',
})
export class Logout {
  // region DI

  private readonly userService: UserService = inject(UserService);
  private readonly http: UserHttpService = inject(UserHttpService);

  // endregion

  async logout(): Promise<void> {
    try {
      const resp: HttpResponse<void> = await firstValueFrom(this.http.logout());
      const logoutUri: string | null = resp.headers.get('Location');
      if (logoutUri && typeof window !== 'undefined') {
        window.location.href = logoutUri;
      }
    } finally {
      this.userService.refresh();
    }
  }
}
