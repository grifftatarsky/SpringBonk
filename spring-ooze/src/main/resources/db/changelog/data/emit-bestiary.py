"""Turn the parsed bestiary into Liquibase load-data CSVs.

Ids are UUIDv5 derived from a stable name, so re-running the parser against the
same PDF produces byte-identical files — the CSVs are reviewable as a diff, and
a correction to the parser shows up as a change to the rows it affects rather
than as 4,000 new ids.
"""
import csv
import json
import os
import uuid

SCRATCH = os.path.dirname(os.path.abspath(__file__))
DATA = SCRATCH
NS = uuid.UUID('5bd10000-0000-4000-a000-000000000000')  # "SRD" namespace for this import
# Liquibase's loadData DATE parser wants ISO_LOCAL_DATE_TIME; a trailing Z
# makes it give up and inline the value as a bare SQL literal.
STAMP = '2026-09-08T00:00:00'

blocks = json.load(open(f'{SCRATCH}/bestiary.json'))
condition_ids = json.load(open(f'{SCRATCH}/condition_ids.json'))
os.makedirs(DATA, exist_ok=True)


def uid(*parts):
    return str(uuid.uuid5(NS, 'oozengine:' + ':'.join(str(p) for p in parts)))


NULL = 'NULL'  # matches nullPlaceholder in 029-seed-bestiary.yaml


def n(v):
    """Empty and None become the placeholder loadData reads as SQL NULL."""
    return NULL if v is None or v == '' else v


def write(name, header, rows):
    rows = [[n(c) for c in r] for r in rows]
    path = f'{DATA}/{name}'
    with open(path, 'w', newline='') as fh:
        w = csv.writer(fh, quoting=csv.QUOTE_MINIMAL, lineterminator='\n')
        w.writerow(header)
        w.writerows(rows)
    print(f'  {name:<44} {len(rows):>5} rows')


monsters, stat_blocks = [], []
speeds, saves, skills, senses, damage, immunities = [], [], [], [], [], []
features, effects, gear = [], [], []

for b in blocks:
    sb = uid('statblock', b['name'])
    mid = uid('monster', b['name'])
    monsters.append([mid, STAMP, STAMP, 0, 'SRD_5_2', b['name'], sb])
    stat_blocks.append([
        sb, STAMP, STAMP, 0, b['size'], b['creatureType'], b['creatureSubtype'] or '',
        b['alignment'] or '', b['armorClass'] if b['armorClass'] is not None else '',
        b['initiativeBonus'] if b['initiativeBonus'] is not None else '',
        b['hpAverage'] if b['hpAverage'] is not None else '',
        b['hpDiceCount'] if b['hpDiceCount'] is not None else '',
        b['hpDiceFaces'] if b['hpDiceFaces'] is not None else '',
        b['hpDiceBonus'] if b['hpDiceBonus'] is not None else '',
        'true' if b['canHover'] else 'false',
        b['scores'].get('STRENGTH', ''), b['scores'].get('DEXTERITY', ''),
        b['scores'].get('CONSTITUTION', ''), b['scores'].get('INTELLIGENCE', ''),
        b['scores'].get('WISDOM', ''), b['scores'].get('CHARISMA', ''),
        b['passivePerception'] if b['passivePerception'] is not None else '',
        b['languages'] or '', b['telepathyFeet'] if b['telepathyFeet'] is not None else '',
        b['challengeRating'] if b['challengeRating'] is not None else '',
        b['experiencePoints'] if b['experiencePoints'] is not None else '',
        b['proficiencyBonus'] if b['proficiencyBonus'] is not None else '',
        b['legendaryActionUses'] if b['legendaryActionUses'] is not None else '',
    ])
    for mode, feet in sorted(b['speeds'].items()):
        speeds.append([sb, mode, feet])
    for ability, bonus in sorted(b['saves'].items()):
        saves.append([sb, ability, bonus])
    for skill, bonus in sorted(b['skills'].items()):
        skills.append([sb, skill, bonus])
    for sense, feet in sorted(b['senses'].items()):
        senses.append([sb, sense, feet])
    for d in b['damageResponses']:
        damage.append([sb, d['damageType'], d['response']])
    for c in sorted(set(b['conditionImmunities'])):
        if c in condition_ids:
            immunities.append([sb, condition_ids[c]])
    for g in b['gear']:
        gear.append([sb, g['name'], g['quantity']])

    for f in b['features']:
        fid = uid('feature', b['name'], f['ordinal'], f['name'])
        features.append([
            fid, STAMP, STAMP, 0, f['name'], f['description'], f['ordinal'], sb,
            f['activation'],
            f['legendaryCost'] if f['legendaryCost'] is not None else '',
            f['triggerText'] or '', 'false',
            f['usesReset'], f['usesMax'] if f['usesMax'] is not None else '',
            f['rechargeMin'] if f['rechargeMin'] is not None else '',
            f['rechargeMax'] if f['rechargeMax'] is not None else '',
            f['rangeFeet'] if f['rangeFeet'] is not None else '',
            f['rangeLongFeet'] if f['rangeLongFeet'] is not None else '',
            f['reachFeet'] if f['reachFeet'] is not None else '',
            f['delivery'], f['attackKind'] or '',
            f['attackBonus'] if f['attackBonus'] is not None else '',
            'FIXED' if f['attackBonus'] is not None else '',
            f['saveAbility'] or '', f['saveDc'] if f['saveDc'] is not None else '',
            'FIXED' if f['saveDc'] is not None else '',
        ])
        for k, e in enumerate(f['effects']):
            effects.append([
                uid('effect', b['name'], f['ordinal'], f['name'], k),
                STAMP, STAMP, 0, fid, e['outcome'], e['kind'], k,
                e['diceCount'] if e['diceCount'] is not None else '',
                e['diceFaces'] if e['diceFaces'] is not None else '',
                e['diceBonus'] if e['diceBonus'] is not None else '',
                e['diceAverage'] if e['diceAverage'] is not None else '',
                e['damageType'] or '',
                'true' if e['halfDamage'] else 'false',
                condition_ids.get(e['conditionName'] or '', ''),
                e['escapeDc'] if e['escapeDc'] is not None else '',
                e['notes'] or '',
            ])

print('writing CSVs:')
write('bestiary-monsters.csv',
      ['id', 'created_at', 'updated_at', 'version', 'srd_version', 'name', 'stat_block_id'],
      monsters)
write('bestiary-stat-blocks.csv',
      ['id', 'created_at', 'updated_at', 'version', 'size', 'creature_type', 'creature_subtype',
       'alignment', 'armor_class', 'initiative_bonus', 'hp_average', 'hp_dice_count',
       'hp_dice_faces', 'hp_dice_bonus', 'can_hover', 'score_strength', 'score_dexterity',
       'score_constitution', 'score_intelligence', 'score_wisdom', 'score_charisma',
       'passive_perception', 'languages', 'telepathy_feet', 'challenge_rating',
       'experience_points', 'proficiency_bonus', 'legendary_action_uses'],
      stat_blocks)
write('bestiary-speeds.csv', ['stat_block_id', 'movement_type', 'speed_feet'], speeds)
write('bestiary-saves.csv', ['stat_block_id', 'ability', 'bonus'], saves)
write('bestiary-skills.csv', ['stat_block_id', 'skill', 'bonus'], skills)
write('bestiary-senses.csv', ['stat_block_id', 'sense_type', 'range_feet'], senses)
write('bestiary-damage-responses.csv', ['stat_block_id', 'damage_type', 'response'], damage)
write('bestiary-condition-immunities.csv', ['stat_block_id', 'condition_id'], immunities)
write('bestiary-features.csv',
      ['id', 'created_at', 'updated_at', 'version', 'name', 'description', 'ordinal',
       'stat_block_id', 'activation', 'legendary_cost', 'trigger_text', 'ritual', 'uses_reset',
       'uses_max', 'recharge_min', 'recharge_max', 'range_feet', 'range_long_feet', 'reach_feet',
       'delivery', 'attack_kind', 'attack_bonus', 'attack_bonus_source', 'save_ability',
       'save_dc', 'save_dc_source'],
      features)
write('bestiary-effects.csv',
      ['id', 'created_at', 'updated_at', 'version', 'feature_id', 'outcome', 'kind', 'ordinal',
       'dice_count', 'dice_faces', 'dice_bonus', 'dice_average', 'damage_type', 'half_damage',
       'condition_id', 'escape_dc', 'notes'],
      effects)
write('bestiary-gear.csv', ['stat_block_id', 'item_name', 'quantity'], gear)
