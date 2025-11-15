export const PROFILE_AVATAR_IDS = [
  'BONKLING_EMERALD',
  'BONKLING_SUNRISE',
  'BONKLING_LAGOON',
  'BONKLING_PLUM',
  'BONKLING_EMBER',
  'BONKLING_DIAMOND',
] as const;

export type ProfileAvatarId = (typeof PROFILE_AVATAR_IDS)[number];
