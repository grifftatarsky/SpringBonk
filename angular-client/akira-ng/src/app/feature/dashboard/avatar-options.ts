import { ProfileAvatarId } from '../../model/type/profile-avatar-id';

export interface AvatarOption {
  id: ProfileAvatarId;
  label: string;
  tagline: string;
  spritePosition: string;
}

export const AVATAR_OPTIONS: readonly AvatarOption[] = [
  {
    id: 'BONKLING_EMERALD',
    label: 'Bonkling Emerald',
    tagline: 'A little green nut who literally cannot put a book down. Hordes them in a big pile in their hands.',
    spritePosition: '8% 19%',
  },
  {
    id: 'BONKLING_SUNRISE',
    label: 'Bonkling Sunrise',
    tagline: 'The resident night owl. Reads under the cover of dark, wears all black, covered in alarm clocks, the little freak.',
    spritePosition: '50% 19%',
  },
  {
    id: 'BONKLING_LAGOON',
    label: 'Bonkling Lagoon',
    tagline: 'Cannot keep a book clean. Covered in coffee stains, this slob needs sixteen book jackets on one book.',
    spritePosition: '92% 19%',
  },
  {
    id: 'BONKLING_PLUM',
    label: 'Bonkling Plum',
    tagline: 'This bastard dogears every single page of a book. Has dog ears, so I guess that may be why? Unsure what the bit is.',
    spritePosition: '7% 80%',
  },
  {
    id: 'BONKLING_EMBER',
    label: 'Bookling Ember',
    tagline: 'Weirdo who smokes while reading. Cigarette dust all over everything, and they dress like a mime, ugh.',
    spritePosition: '92% 79%',
  },
  {
    id: 'BONKLING_DIAMOND',
    label: 'Bookling Diamond',
    tagline: 'A little knight. Where did they get that armor? What does this have to do with books? Why?',
    spritePosition: '50% 79%',
  },
];

export function findAvatarOption(id: ProfileAvatarId): AvatarOption {
  return AVATAR_OPTIONS.find((option: AvatarOption): boolean => option.id === id)
    ?? AVATAR_OPTIONS[0];
}
