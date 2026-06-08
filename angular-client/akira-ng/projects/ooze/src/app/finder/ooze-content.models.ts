/**
 * Schema-driven catalog. Each content type is described by a {@link ContentTypeDef}
 * — its fields, how to label/group/subtitle items — and the generic finder,
 * service, and panel render everything from these. Adding a backed type is a
 * matter of adding a def (plus its backend slice).
 */

export type FieldKind = 'text' | 'textarea' | 'number' | 'select' | 'boolean';

export interface FieldOption {
  readonly value: string | number;
  readonly label: string;
}

export interface FieldDef {
  /** Matches the backend DTO property name. */
  readonly key: string;
  readonly label: string;
  readonly kind: FieldKind;
  /** `meta` → compact label/value grid; `prose` → full-width text block. */
  readonly group: 'meta' | 'prose';
  readonly options?: readonly FieldOption[];
  readonly required?: boolean;
  readonly min?: number;
  readonly max?: number;
}

/** A row from any catalog endpoint. Always has these; other keys are per-type. */
export interface CatalogItem {
  readonly id: string;
  readonly name: string;
  readonly base: boolean;
  readonly overridesId: string | null;
  readonly [key: string]: unknown;
}

export interface ListGroup {
  readonly key: string | number;
  readonly label: string;
  readonly order: number;
}

export interface ContentTypeDef {
  readonly key: string;
  readonly title: string;
  /** REST path under /bff/ooz, e.g. "spell". */
  readonly apiPath: string;
  /** 24×24 stroked SVG path for the folder glyph. */
  readonly iconPath: string;
  readonly description: string;
  readonly implemented: boolean;
  readonly fields: readonly FieldDef[];
  /** Secondary line under the name (detail + list). */
  readonly subtitle?: (item: CatalogItem) => string;
  /** Optional list grouping (e.g. spells by level). */
  readonly group?: (item: CatalogItem) => ListGroup;
}

// region option sets

const SCHOOL_OPTIONS: readonly FieldOption[] = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation',
].map(s => ({ value: s.toUpperCase(), label: s }));

const LEVEL_OPTIONS: readonly FieldOption[] = [
  { value: 0, label: 'Cantrip' },
  ...Array.from({ length: 9 }, (_, i) => ({ value: i + 1, label: `Level ${i + 1}` })),
];

const ITEM_CATEGORY_OPTIONS: readonly FieldOption[] = [
  'Weapon', 'Armor', 'Adventuring Gear', 'Tool', 'Consumable', 'Wondrous Item', 'Other',
].map(c => ({ value: c, label: c }));

const RARITY_OPTIONS: readonly FieldOption[] = [
  { value: '', label: '—' },
  ...['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact'].map(r => ({ value: r, label: r })),
];

// endregion

const ABILITY_FIELDS: readonly FieldDef[] = (
  [['strength', 'STR'], ['dexterity', 'DEX'], ['constitution', 'CON'],
   ['intelligence', 'INT'], ['wisdom', 'WIS'], ['charisma', 'CHA']] as const
).map(([key, label]) => ({ key, label, kind: 'number' as const, group: 'meta' as const, min: 1, max: 30 }));

const titleCase = (s: string): string => s.charAt(0) + s.slice(1).toLowerCase();

export const CONTENT_TYPES: readonly ContentTypeDef[] = [
  {
    key: 'spells',
    title: 'Spells',
    apiPath: 'spell',
    iconPath: 'M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7z',
    description: 'The grimoire, by level and school.',
    implemented: true,
    fields: [
      { key: 'level', label: 'Level', kind: 'select', group: 'meta', required: true, options: LEVEL_OPTIONS },
      { key: 'school', label: 'School', kind: 'select', group: 'meta', required: true, options: SCHOOL_OPTIONS },
      { key: 'castingTime', label: 'Casting time', kind: 'text', group: 'meta' },
      { key: 'range', label: 'Range', kind: 'text', group: 'meta' },
      { key: 'duration', label: 'Duration', kind: 'text', group: 'meta' },
      { key: 'verbalComponent', label: 'Verbal', kind: 'boolean', group: 'meta' },
      { key: 'somaticComponent', label: 'Somatic', kind: 'boolean', group: 'meta' },
      { key: 'materialComponent', label: 'Material', kind: 'boolean', group: 'meta' },
      { key: 'concentration', label: 'Concentration', kind: 'boolean', group: 'meta' },
      { key: 'ritual', label: 'Ritual', kind: 'boolean', group: 'meta' },
      { key: 'materials', label: 'Materials', kind: 'text', group: 'meta' },
      { key: 'description', label: 'Description', kind: 'textarea', group: 'prose', required: true },
      { key: 'atHigherLevels', label: 'At higher levels', kind: 'textarea', group: 'prose' },
    ],
    subtitle: i => {
      const lvl = Number(i['level']);
      const school = titleCase(String(i['school'] ?? ''));
      return `${lvl === 0 ? 'Cantrip' : `Level ${lvl}`}${school ? ` · ${school}` : ''}`;
    },
    group: i => {
      const lvl = Number(i['level']);
      return { key: lvl, label: lvl === 0 ? 'Cantrips' : `Level ${lvl}`, order: lvl };
    },
  },
  {
    key: 'items',
    title: 'Items & gear',
    apiPath: 'item',
    iconPath: 'M5 8h14v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM9 8a3 3 0 0 1 6 0',
    description: 'Weapons, armor, and equipment.',
    implemented: true,
    fields: [
      { key: 'category', label: 'Category', kind: 'select', group: 'meta', required: true, options: ITEM_CATEGORY_OPTIONS },
      { key: 'rarity', label: 'Rarity', kind: 'select', group: 'meta', options: RARITY_OPTIONS },
      { key: 'cost', label: 'Cost', kind: 'text', group: 'meta' },
      { key: 'weight', label: 'Weight', kind: 'text', group: 'meta' },
      { key: 'attunement', label: 'Requires attunement', kind: 'boolean', group: 'meta' },
      { key: 'description', label: 'Description', kind: 'textarea', group: 'prose', required: true },
      { key: 'properties', label: 'Properties', kind: 'textarea', group: 'prose' },
    ],
    subtitle: i => {
      const cat = String(i['category'] ?? '');
      const rarity = String(i['rarity'] ?? '');
      return rarity ? `${cat} · ${rarity}` : cat;
    },
    group: i => ({ key: String(i['category'] ?? 'Other'), label: String(i['category'] ?? 'Other'), order: 0 }),
  },
  {
    key: 'backgrounds',
    title: 'Backgrounds',
    apiPath: 'background',
    iconPath: 'M6.5 4h11v16h-11zM9 9h6M9 13h6',
    description: 'Origins, proficiencies, and a feat.',
    implemented: true,
    fields: [
      { key: 'abilityScores', label: 'Ability scores', kind: 'text', group: 'meta' },
      { key: 'feat', label: 'Origin feat', kind: 'text', group: 'meta' },
      { key: 'skillProficiencies', label: 'Skills', kind: 'text', group: 'meta' },
      { key: 'toolProficiencies', label: 'Tools', kind: 'text', group: 'meta' },
      { key: 'equipment', label: 'Equipment', kind: 'textarea', group: 'prose' },
      { key: 'description', label: 'Description', kind: 'textarea', group: 'prose', required: true },
    ],
    subtitle: i => String(i['abilityScores'] ?? ''),
  },
  {
    key: 'species',
    title: 'Species',
    apiPath: 'species',
    iconPath: 'M5 19c0-7 5-13 14-14 1 9-5 15-14 14zM8 16l8-8',
    description: 'Ancestries and their traits.',
    implemented: true,
    fields: [
      { key: 'size', label: 'Size', kind: 'text', group: 'meta' },
      { key: 'speed', label: 'Speed', kind: 'text', group: 'meta' },
      { key: 'creatureType', label: 'Type', kind: 'text', group: 'meta' },
      { key: 'traits', label: 'Traits', kind: 'textarea', group: 'prose' },
      { key: 'description', label: 'Description', kind: 'textarea', group: 'prose' },
    ],
    subtitle: i => [i['size'], i['creatureType']].filter(Boolean).join(' '),
  },
  {
    key: 'classes',
    title: 'Classes',
    apiPath: 'vocation',
    iconPath: 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z',
    description: 'Vocations, hit dice, and saves.',
    implemented: true,
    fields: [
      { key: 'primaryAbility', label: 'Primary ability', kind: 'text', group: 'meta' },
      { key: 'hitDie', label: 'Hit die', kind: 'text', group: 'meta' },
      { key: 'savingThrows', label: 'Saving throws', kind: 'text', group: 'meta' },
      { key: 'complexity', label: 'Complexity', kind: 'text', group: 'meta' },
      { key: 'likes', label: 'Likes', kind: 'text', group: 'meta' },
      { key: 'description', label: 'Description', kind: 'textarea', group: 'prose' },
    ],
    subtitle: i => (i['primaryAbility'] ? `Primary: ${i['primaryAbility']}` : ''),
  },
  {
    key: 'bestiary',
    title: 'Bestiary',
    apiPath: 'monster',
    iconPath: 'M7 4c1.2 5 1.2 11 0 16M12 4c1.2 5 1.2 11 0 16M17 4c1.2 5 1.2 11 0 16',
    description: 'Monsters and statblocks.',
    implemented: true,
    fields: [
      { key: 'size', label: 'Size', kind: 'text', group: 'meta' },
      { key: 'creatureType', label: 'Type', kind: 'text', group: 'meta' },
      { key: 'alignment', label: 'Alignment', kind: 'text', group: 'meta' },
      { key: 'challengeRating', label: 'CR', kind: 'text', group: 'meta' },
      { key: 'armorClass', label: 'AC', kind: 'number', group: 'meta', min: 0, max: 40 },
      { key: 'hitPoints', label: 'HP', kind: 'text', group: 'meta' },
      { key: 'speed', label: 'Speed', kind: 'text', group: 'meta' },
      ...ABILITY_FIELDS,
      { key: 'traits', label: 'Traits', kind: 'textarea', group: 'prose' },
      { key: 'actions', label: 'Actions', kind: 'textarea', group: 'prose' },
      { key: 'description', label: 'Description', kind: 'textarea', group: 'prose' },
    ],
    subtitle: i =>
      [i['challengeRating'] ? `CR ${i['challengeRating']}` : '', [i['size'], i['creatureType']].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(' · '),
  },
  {
    key: 'feats',
    title: 'Feats',
    apiPath: 'feat',
    iconPath: 'M12 3l2.2 4.8 5.3.5-4 3.6 1.2 5.1L12 14.8 7.3 17l1.2-5.1-4-3.6 5.3-.5z',
    description: 'Origin, general, and epic boons.',
    implemented: true,
    fields: [
      {
        key: 'featCategory',
        label: 'Category',
        kind: 'select',
        group: 'meta',
        required: true,
        options: [
          { value: 'Origin', label: 'Origin' },
          { value: 'General', label: 'General' },
          { value: 'Fighting Style', label: 'Fighting Style' },
          { value: 'Epic Boon', label: 'Epic Boon' },
        ],
      },
      { key: 'prerequisite', label: 'Prerequisite', kind: 'text', group: 'meta' },
      { key: 'description', label: 'Description', kind: 'textarea', group: 'prose', required: true },
    ],
    subtitle: i =>
      [String(i['featCategory'] ?? ''), i['prerequisite'] ? `Prereq: ${i['prerequisite']}` : '']
        .filter(Boolean)
        .join(' · '),
    group: i => ({
      key: String(i['featCategory'] ?? 'Other'),
      label: String(i['featCategory'] ?? 'Other'),
      order: 0,
    }),
  },
  {
    key: 'conditions',
    title: 'Conditions',
    apiPath: 'condition',
    iconPath: 'M3 12h4l2.5 7 5-14 2.5 7h4',
    description: 'Blinded, Prone, Stunned, and the rest.',
    implemented: true,
    fields: [{ key: 'description', label: 'Effect', kind: 'textarea', group: 'prose', required: true }],
  },
  {
    key: 'weapon-mastery',
    title: 'Weapon Mastery',
    apiPath: 'weapon-mastery',
    iconPath: 'M14.5 3.5 21 10l-2 2-6.5-6.5zM3 21l6-6M9 9l-6 6 3 3 6-6',
    description: 'Cleave, Topple, Vex, and more.',
    implemented: true,
    fields: [{ key: 'description', label: 'Effect', kind: 'textarea', group: 'prose', required: true }],
  },
  {
    key: 'glossary',
    title: 'Rules glossary',
    apiPath: 'glossary',
    iconPath: 'M5 4h13a1 1 0 0 1 1 1v15H6a2 2 0 0 1-2-2V4zM9 4v16',
    description: 'Quick reference for key rules terms.',
    implemented: true,
    fields: [{ key: 'description', label: 'Definition', kind: 'textarea', group: 'prose', required: true }],
  },
  {
    key: 'characters',
    title: 'Characters',
    apiPath: 'character',
    iconPath: 'M8.5 8a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6',
    description: 'Your player characters and NPCs.',
    implemented: true,
    fields: [
      {
        key: 'kind',
        label: 'Type',
        kind: 'select',
        group: 'meta',
        required: true,
        options: [
          { value: 'PLAYER_CHARACTER', label: 'Player Character' },
          { value: 'NPC', label: 'NPC' },
        ],
      },
      { key: 'species', label: 'Species', kind: 'text', group: 'meta' },
      { key: 'characterClass', label: 'Class', kind: 'text', group: 'meta' },
      { key: 'level', label: 'Level', kind: 'number', group: 'meta', min: 1, max: 20 },
      { key: 'background', label: 'Background', kind: 'text', group: 'meta' },
      { key: 'alignment', label: 'Alignment', kind: 'text', group: 'meta' },
      { key: 'armorClass', label: 'AC', kind: 'number', group: 'meta', min: 0, max: 40 },
      { key: 'hitPoints', label: 'HP', kind: 'text', group: 'meta' },
      ...ABILITY_FIELDS,
      { key: 'description', label: 'Description', kind: 'textarea', group: 'prose' },
      { key: 'notes', label: 'Notes', kind: 'textarea', group: 'prose' },
    ],
    subtitle: i =>
      [i['level'] ? `Level ${i['level']}` : '', i['characterClass'], i['species']]
        .filter(Boolean)
        .join(' · '),
    group: i =>
      i['kind'] === 'NPC'
        ? { key: 'NPC', label: 'NPCs', order: 1 }
        : { key: 'PC', label: 'Player Characters', order: 0 },
  },
  {
    key: 'encounters',
    title: 'Encounters',
    apiPath: 'encounter',
    iconPath: 'M4 4l16 16M20 4 4 20',
    description: 'Build and balance combats.',
    implemented: false,
    fields: [],
  },
];
