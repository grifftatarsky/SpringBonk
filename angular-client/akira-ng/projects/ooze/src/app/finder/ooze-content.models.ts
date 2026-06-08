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
    key: 'characters',
    title: 'Characters',
    apiPath: 'character',
    iconPath: 'M8.5 8a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6',
    description: 'Player characters and sheets.',
    implemented: false,
    fields: [],
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
