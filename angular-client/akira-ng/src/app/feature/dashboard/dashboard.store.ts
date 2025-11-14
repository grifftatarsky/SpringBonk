import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UserService } from '../../auth/user.service';
import { User } from '../../auth/user.model';

export type DashboardViewModel = Readonly<{
  id: string;
  name: string;
  email: string;
  roles: readonly string[];
  initials: string;
  isAuthenticated: boolean;
  statusLabel: string;
  helperText: string;
}>;

@Injectable({ providedIn: 'root' })
export class DashboardStore {
  // region DI

  private readonly userService: UserService = inject(UserService);

  // endregion

  private readonly userSignal = toSignal(this.userService.valueChanges, {
    initialValue: this.userService.current,
  });

  readonly vm = computed<DashboardViewModel>(() => {
    const user: User = this.userSignal();
    const trimmedName: string = user.name?.trim() || 'Guest user';
    const trimmedEmail: string = user.email?.trim() || 'Not connected';
    const roles: readonly string[] = (user.roles || []).filter(Boolean);
    const isAuthenticated: boolean = user.isAuthenticated;

    return {
      id: user.id,
      name: trimmedName,
      email: trimmedEmail,
      roles,
      initials: this.createInitials(trimmedName),
      isAuthenticated,
      statusLabel: isAuthenticated ? 'Session active' : 'Sign in required',
      helperText: isAuthenticated
        ? 'Access elections and shelves without interruption.'
        : 'Sign in to vote, nominate books, and curate your shelves.',
    };
  });

  refreshProfile(): void {
    console.debug('[DashboardStore] refreshProfile invoked');
    this.userService.refresh();
  }

  private createInitials(name: string): string {
    const fallback: string = 'SB';
    if (!name) {
      return fallback;
    }

    const cleanParts: string[] = name
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((part: string): string => part.trim());

    if (!cleanParts.length) {
      return fallback;
    }

    if (cleanParts.length === 1) {
      return cleanParts[0].substring(0, 2).toUpperCase().padEnd(2, fallback[1]);
    }

    return `${cleanParts[0][0]}${cleanParts[cleanParts.length - 1][0]}`.toUpperCase();
  }
}
