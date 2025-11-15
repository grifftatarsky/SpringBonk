import { ProfileAvatarId } from '../model/type/profile-avatar-id';

export class User {
  static readonly ANONYMOUS: User = new User('', '', '', [], 'BOOKLING_EMERALD');

  constructor(
    readonly id: string,
    readonly name: string,
    readonly email: string,
    readonly roles: string[],
    readonly avatar: ProfileAvatarId,
  ) {
  }

  get isAuthenticated(): boolean {
    return !!this.id && !User.isZeroUuid(this.id);
  }

  static isZeroUuid(id: string | null | undefined): boolean {
    return (id || '').toLowerCase() === '00000000-0000-0000-0000-000000000000';
  }
}
