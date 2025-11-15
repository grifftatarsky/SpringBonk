export const PROFILE_AVATAR_IDS = [
  'BOOKLING_EMERALD',
  'BOOKLING_SUNRISE',
  'BOOKLING_LAGOON',
  'BOOKLING_PLUM',
  'BOOKLING_EMBER',
] as const;

export type ProfileAvatarId = (typeof PROFILE_AVATAR_IDS)[number];
