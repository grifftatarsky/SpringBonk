export class User {
  static readonly ANONYMOUS: User = new User('', '', '', []);

  constructor(
    readonly id: string,
    readonly name: string,
    readonly email: string,
    readonly roles: string[]
  ) {}

  get isAuthenticated(): boolean {
    return !!this.id && !User.isZeroUuid(this.id);
  }

  static isZeroUuid(id: string | null | undefined): boolean {
    return (id || '').toLowerCase() === '00000000-0000-0000-0000-000000000000';
  }

  // TODO __ This is unused, and I have no idea if it'll work if I implement roles.
  hasAnyRole(...roles: string[]): boolean {
    for (const r of roles) {
      if (this.roles.includes(r)) {
        return true;
      }
    }
    return false;
  }
}
