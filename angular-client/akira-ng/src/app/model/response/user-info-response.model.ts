import { ProfileAvatarId } from '../type/profile-avatar-id';

export interface UserInfoResponse {
  id: string; // UUID string (token subject)
  username: string; // human-friendly username
  email: string;
  roles: string[];
  exp: number;
  avatar: ProfileAvatarId;
}
