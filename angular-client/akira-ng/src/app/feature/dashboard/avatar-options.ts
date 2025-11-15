import { ProfileAvatarId } from '../../model/type/profile-avatar-id';

export interface AvatarOption {
  id: ProfileAvatarId;
  label: string;
  tagline: string;
  asset: string;
}

export const AVATAR_OPTIONS: readonly AvatarOption[] = [
  {
    id: 'BOOKLING_EMERALD',
    label: 'Bookling Emerald',
    tagline: 'Calm scribbler fueled by herbal tea.',
    asset: 'assets/avatars/bookling-emerald.svg',
  },
  {
    id: 'BOOKLING_SUNRISE',
    label: 'Bookling Sunrise',
    tagline: 'Optimist powered by fresh annotations.',
    asset: 'assets/avatars/bookling-sunrise.svg',
  },
  {
    id: 'BOOKLING_LAGOON',
    label: 'Bookling Lagoon',
    tagline: 'Tidal researcher who bookmarks every reef.',
    asset: 'assets/avatars/bookling-lagoon.svg',
  },
  {
    id: 'BOOKLING_PLUM',
    label: 'Bookling Plum',
    tagline: 'Nocturnal critic with velvet page corners.',
    asset: 'assets/avatars/bookling-plum.svg',
  },
  {
    id: 'BOOKLING_EMBER',
    label: 'Bookling Ember',
    tagline: 'Fiery closer who keeps the vote moving.',
    asset: 'assets/avatars/bookling-ember.svg',
  },
];

export function findAvatarOption(id: ProfileAvatarId): AvatarOption {
  return AVATAR_OPTIONS.find((option) => option.id === id) ?? AVATAR_OPTIONS[0];
}
