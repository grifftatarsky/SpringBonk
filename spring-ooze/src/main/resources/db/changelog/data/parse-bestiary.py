"""Parse the SRD 5.2.1 bestiary into the Oozengine rules model.

Reads the column-extracted text of the Monsters A-Z and Animals chapters and
produces one record per stat block, with features and effects structured the way
`features` / `effects` store them.

The 2024 stat block is a fixed template, so this is transcription rather than
interpretation. Where a sentence carries more than the columns can, the sentence
is kept verbatim in the feature's description and in an effect's notes — nothing
from the book is discarded.
"""
import json
import re
import sys

SRC = 'mon521full.txt'
OUT = 'bestiary.json'

SIZES = ('Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan')
ABILITIES = ('Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha')
ABILITY_NAMES = {'Str': 'STRENGTH', 'Dex': 'DEXTERITY', 'Con': 'CONSTITUTION',
                 'Int': 'INTELLIGENCE', 'Wis': 'WISDOM', 'Cha': 'CHARISMA'}
DAMAGE_TYPES = ('Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic',
                'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder')
CONDITIONS = ('Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled',
              'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone',
              'Restrained', 'Stunned', 'Unconscious')
SENSES = ('Blindsight', 'Darkvision', 'Tremorsense', 'Truesight')
SKILLS = {'Acrobatics': 'ACROBATICS', 'Animal Handling': 'ANIMAL_HANDLING', 'Arcana': 'ARCANA',
          'Athletics': 'ATHLETICS', 'Deception': 'DECEPTION', 'History': 'HISTORY',
          'Insight': 'INSIGHT', 'Intimidation': 'INTIMIDATION', 'Investigation': 'INVESTIGATION',
          'Medicine': 'MEDICINE', 'Nature': 'NATURE', 'Perception': 'PERCEPTION',
          'Performance': 'PERFORMANCE', 'Persuasion': 'PERSUASION', 'Religion': 'RELIGION',
          'Sleight of Hand': 'SLEIGHT_OF_HAND', 'Stealth': 'STEALTH', 'Survival': 'SURVIVAL'}
SECTIONS = {'Traits': 'PASSIVE', 'Actions': 'ACTION', 'Bonus Actions': 'BONUS_ACTION',
            'Reactions': 'REACTION', 'Legendary Actions': 'LEGENDARY'}

SIZE_ALT = r'(?:%s)(?: or (?:%s))?' % ('|'.join(SIZES), '|'.join(SIZES))
HEADER = re.compile(
    r'^(%s) (Swarm of \w+ )?(\w+)(?: \(([^)]+)\))?, (.+)$' % SIZE_ALT)
DICE = r'(\d+) \((\d+d\d+(?: [+-] \d+)?)\)'


def norm(text):
    text = text.replace('\x0c', '')
    for a, b in (('−', '-'), ('–', '-'), ('—', '-'), ('’', "'"),
                 ('‘', "'"), ('“', '"'), ('”', '"'), (' ', ' ')):
        text = text.replace(a, b)
    return text


def load_lines():
    raw = norm(open(SRC, encoding='utf-8', newline='\n').read())
    return [re.sub(r'[ \t]+', ' ', l).strip() for l in raw.split('\n')]


def split_dice(expr):
    """'2d6 + 5' -> (2, 6, 5)."""
    m = re.match(r'(\d+)d(\d+)(?: ([+-]) (\d+))?', expr)
    if not m:
        return None, None, None
    bonus = int(m.group(4)) * (-1 if m.group(3) == '-' else 1) if m.group(4) else None
    return int(m.group(1)), int(m.group(2)), bonus


def parse_speeds(line):
    speeds, hover = {}, False
    if 'hover' in line:
        hover = True
    walk = re.match(r'Speed (\d+) ?ft', line)
    if walk:
        speeds['WALK'] = int(walk.group(1))
    for mode, key in (('Burrow', 'BURROW'), ('Climb', 'CLIMB'), ('Fly', 'FLY'), ('Swim', 'SWIM')):
        m = re.search(r'%s (\d+) ?ft' % mode, line, re.I)
        if m:
            speeds[key] = int(m.group(1))
    return speeds, hover


def parse_damage_list(text):
    """'Poison, Thunder; Exhaustion, Grappled' -> (damage types, condition names).

    The semicolon separates damage from conditions, but a creature immune only
    to conditions has no semicolon at all — so when there isn't one, classify
    each name on its own rather than assuming the whole line is damage.
    """
    if ';' in text:
        dmg_part, _, cond_part = text.partition(';')
    else:
        dmg_part = cond_part = text
    dmg = [d for d in DAMAGE_TYPES if re.search(r'\b%s\b' % d, dmg_part)]
    conds = [c for c in CONDITIONS if re.search(r'\b%s\b' % c, cond_part)]
    return dmg, conds


def feature_starts(body):
    """Line indexes where a feature begins.

    A feature's name is bold in the book and starts a paragraph, which after
    text extraction means: it begins a line, and the line before it is blank, a
    section heading, or the end of a sentence. Requiring the line start is what
    separates 'Air Form. The elemental...' from '...stop there. It can move',
    which is the same shape in the middle of a line.
    """
    out = []
    for i, l in enumerate(body):
        m = re.match(r"^([A-Z][A-Za-z'()/\d, +-]{0,60}?)\.\s+(?=[A-Z0-9])", l)
        if not m:
            continue
        name = m.group(1)
        if len(name.split()) > 8:
            continue
        prev = body[i - 1].strip() if i else ''
        # A colon ends a clause, not a paragraph: "Fire Breath (Recharge 5-6).
        # Dexterity Saving Throw:" wraps, and the next line starting "DC 21,
        # each creature in a 60-foot Cone." is that same feature continuing.
        if prev and prev not in SECTIONS and not re.search(r'[.!?]$', prev):
            continue
        out.append((i, name, l[m.end():]))
    return out


def parse_uses(name):
    """'Dominate Mind (2/Day)' -> ('Dominate Mind', reset, max, recharge range)."""
    m = re.match(r'^(.*?)\s*\((.*)\)\s*$', name)
    if not m:
        return name, 'AT_WILL', None, None, None
    base, note = m.group(1), m.group(2)
    rec = re.search(r'Recharge (\d)\s*-\s*(\d)', note)
    if rec:
        return base, 'RECHARGE', 1, int(rec.group(1)), int(rec.group(2))
    rec1 = re.search(r'Recharge (\d)\b', note)
    if rec1:
        return base, 'RECHARGE', 1, int(rec1.group(1)), 6
    day = re.search(r'(\d+)/Day', note)
    if day:
        return base, 'PER_DAY', int(day.group(1)), None, None
    if 'Recharges after a Short or Long Rest' in note:
        return base, 'SHORT_REST', 1, None, None
    if 'Recharges after a Long Rest' in note:
        return base, 'LONG_REST', 1, None, None
    return base, 'AT_WILL', None, None, None


ATTACK = re.compile(
    r'(?P<kind>Melee or Ranged|Melee|Ranged) Attack Roll: \+(?P<bonus>\d+)'
    r'(?:\s*\([^)]*\))?,\s*(?P<reach>[^.]*?)\.')
SAVE = re.compile(
    r'(?P<ability>Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) '
    r'Saving Throw: DC (?P<dc>\d+)(?P<targets>[^.]*)\.')


def parse_effects(text):
    """Damage, conditions and half-damage clauses, per outcome branch."""
    effects = []

    def damages(segment, outcome):
        found = []
        for m in re.finditer(DICE + r' (\w+) damage', segment):
            if m.group(3) not in DAMAGE_TYPES:
                continue
            count, faces, bonus = split_dice(m.group(2))
            found.append({'outcome': outcome, 'kind': 'DAMAGE', 'diceCount': count,
                          'diceFaces': faces, 'diceBonus': bonus,
                          'diceAverage': int(m.group(1)), 'damageType': m.group(3).upper(),
                          'halfDamage': False, 'conditionName': None, 'escapeDc': None,
                          'notes': None})
        return found

    def conditions(segment, outcome):
        found = []
        for m in re.finditer(r'has the (%s) condition' % '|'.join(CONDITIONS), segment):
            esc = re.search(r'escape DC (\d+)', segment)
            found.append({'outcome': outcome, 'kind': 'APPLY_CONDITION', 'diceCount': None,
                          'diceFaces': None, 'diceBonus': None, 'diceAverage': None,
                          'damageType': None, 'halfDamage': False,
                          'conditionName': m.group(1),
                          'escapeDc': int(esc.group(1)) if esc else None, 'notes': None})
        return found

    hit = re.search(r'\bHit:(.*?)(?=(?:Failure:|Success:|$))', text, re.S)
    if hit:
        effects += damages(hit.group(1), 'HIT') + conditions(hit.group(1), 'HIT')
    fail = re.search(r'\bFailure:(.*?)(?=(?:Success:|Failure or Success:|$))', text, re.S)
    if fail:
        effects += damages(fail.group(1), 'SAVE_FAILURE') + conditions(fail.group(1), 'SAVE_FAILURE')
    succ = re.search(r'\bSuccess:(.*?)(?=(?:Failure or Success:|$))', text, re.S)
    if succ:
        seg = succ.group(1)
        if re.search(r'Half damage', seg, re.I):
            effects.append({'outcome': 'SAVE_SUCCESS', 'kind': 'DAMAGE', 'diceCount': None,
                            'diceFaces': None, 'diceBonus': None, 'diceAverage': None,
                            'damageType': None, 'halfDamage': True, 'conditionName': None,
                            'escapeDc': None, 'notes': None})
        else:
            effects += damages(seg, 'SAVE_SUCCESS')
    # A feature with no branch labels still deals damage sometimes ("regains 5 (1d10)").
    if not effects and not hit and not fail:
        effects += damages(text, 'ALWAYS')
    return effects


def parse_feature(name, text, activation, ordinal):
    base, reset, uses, rmin, rmax = parse_uses(name)
    f = {'name': base, 'description': text.strip(), 'ordinal': ordinal,
         'activation': activation, 'legendaryCost': None, 'usesReset': reset, 'usesMax': uses,
         'rechargeMin': rmin, 'rechargeMax': rmax, 'delivery': 'AUTOMATIC', 'attackKind': None,
         'attackBonus': None, 'reachFeet': None, 'rangeFeet': None, 'rangeLongFeet': None,
         'saveAbility': None, 'saveDc': None, 'triggerText': None, 'effects': []}
    a = ATTACK.search(text)
    if a:
        f['delivery'] = 'ATTACK_ROLL'
        f['attackKind'] = {'Melee': 'MELEE', 'Ranged': 'RANGED',
                           'Melee or Ranged': 'MELEE_OR_RANGED'}[a.group('kind')]
        f['attackBonus'] = int(a.group('bonus'))
        reach = re.search(r'reach (\d+) ?ft', a.group('reach'))
        rng = re.search(r'range (\d+)/(\d+) ?ft', a.group('reach'))
        if reach:
            f['reachFeet'] = int(reach.group(1))
        if rng:
            f['rangeFeet'], f['rangeLongFeet'] = int(rng.group(1)), int(rng.group(2))
    else:
        s = SAVE.search(text)
        if s:
            f['delivery'] = 'SAVING_THROW'
            f['saveAbility'] = s.group('ability').upper()
            f['saveDc'] = int(s.group('dc'))
            rng = re.search(r'within (\d+) feet', s.group('targets'))
            if rng:
                f['rangeFeet'] = int(rng.group(1))
    if activation == 'REACTION':
        t = re.search(r'Trigger:([^.]*\.)', text)
        if t:
            f['triggerText'] = t.group(1).strip()
    f['effects'] = parse_effects(text)
    return f


def parse_block(name, body):
    b = {'name': name, 'size': None, 'creatureType': None, 'creatureSubtype': None,
         'alignment': None, 'armorClass': None, 'initiativeBonus': None, 'hpAverage': None,
         'hpDiceCount': None, 'hpDiceFaces': None, 'hpDiceBonus': None, 'speeds': {},
         'canHover': False, 'scores': {}, 'saves': {}, 'skills': {}, 'senses': {},
         'passivePerception': None, 'damageResponses': [], 'conditionImmunities': [],
         'gear': [], 'languages': None, 'telepathyFeet': None, 'challengeRating': None,
         'experiencePoints': None, 'proficiencyBonus': None, 'legendaryActionUses': None,
         'alternateSize': None, 'features': []}

    m = HEADER.match(body[0])
    # "Medium or Small" — the book's first size is the default one.
    b['size'] = m.group(1).split(' or ')[0].upper()
    b['alternateSize'] = (m.group(1).split(' or ')[1].upper()
                          if ' or ' in m.group(1) else None)
    b['creatureType'] = m.group(3).upper()
    b['creatureSubtype'] = m.group(4)
    if m.group(2):
        # "Medium Swarm of Tiny Beasts" — the type is printed in the plural
        # because the block is a swarm. The creature type is still Beast; that
        # it is a swarm, and of what size, goes in the subtype.
        b['creatureType'] = re.sub(r'S$', '', m.group(3).upper())
        b['creatureSubtype'] = (m.group(2) + m.group(3)).strip()
    b['alignment'] = m.group(5).strip().upper().replace(' ', '_').rstrip('.')
    if b['alignment'] not in (
            'LAWFUL_GOOD', 'NEUTRAL_GOOD', 'CHAOTIC_GOOD', 'LAWFUL_NEUTRAL', 'NEUTRAL',
            'CHAOTIC_NEUTRAL', 'LAWFUL_EVIL', 'NEUTRAL_EVIL', 'CHAOTIC_EVIL', 'UNALIGNED'):
        b['alignment'] = 'ANY' if 'ANY' in b['alignment'] else None

    # Header entries wrap: "Immunities Poison, Thunder; Exhaustion, Grappled," can
    # run over three lines. Join a continuation onto the label it belongs to
    # before parsing, or everything past the first line is silently dropped.
    LABELS = ('AC ', 'HP ', 'Speed ', 'Skills ', 'Resistances ', 'Immunities ',
              'Vulnerabilities ', 'Gear ', 'Senses ', 'Languages ', 'CR ', 'Str ', 'Int ',
              'MOD ')
    joined, buf = [], None
    for line in body[1:]:
        if line in SECTIONS or (buf is not None and buf[0] in SECTIONS):
            break
        if any(line.startswith(p) for p in LABELS):
            if buf:
                joined.append(buf)
            buf = line
        elif buf and line:
            buf += ' ' + line
        elif not line:
            if buf:
                joined.append(buf)
            buf = None
    if buf:
        joined.append(buf)
    header_end = 1
    for k, line in enumerate(body[1:], start=1):
        if line in SECTIONS:
            header_end = k
            break
    else:
        header_end = len(body)

    section, feature_lines, sections = None, [], []
    for line in joined + body[header_end:]:
        if line in SECTIONS:
            if section:
                sections.append((section, feature_lines))
            section, feature_lines = line, []
            continue
        if section:
            feature_lines.append(line)
            continue
        # header block
        if line.startswith('AC '):
            ac = re.match(r'AC (\d+)', line)
            if ac:
                b['armorClass'] = int(ac.group(1))
            init = re.search(r'Initiative ([+-]\d+)', line)
            if init:
                b['initiativeBonus'] = int(init.group(1))
        elif line.startswith('HP '):
            hp = re.match(r'HP ' + DICE, line)
            if hp:
                b['hpAverage'] = int(hp.group(1))
                b['hpDiceCount'], b['hpDiceFaces'], b['hpDiceBonus'] = split_dice(hp.group(2))
            else:
                flat = re.match(r'HP (\d+)', line)
                if flat:
                    b['hpAverage'] = int(flat.group(1))
        elif line.startswith('Speed '):
            b['speeds'], b['canHover'] = parse_speeds(line)
        elif re.match(r'^(Str|Int) ', line):
            for ab, score, _mod, save in re.findall(
                    r'(%s) ?(\d+) ([+-]\d+) ([+-]?\d+)' % '|'.join(ABILITIES), line):
                b['scores'][ABILITY_NAMES[ab]] = int(score)
                if save.lstrip('+') != _mod.lstrip('+'):
                    b['saves'][ABILITY_NAMES[ab]] = int(save)
        elif line.startswith('Skills '):
            for label, key in SKILLS.items():
                s = re.search(r'\b%s ([+-]\d+)' % label, line)
                if s:
                    b['skills'][key] = int(s.group(1))
        elif line.startswith('Resistances '):
            dmg, _ = parse_damage_list(line[len('Resistances '):])
            b['damageResponses'] += [{'damageType': d.upper(), 'response': 'RESISTANCE'} for d in dmg]
        elif line.startswith('Immunities '):
            dmg, conds = parse_damage_list(line[len('Immunities '):])
            b['damageResponses'] += [{'damageType': d.upper(), 'response': 'IMMUNITY'} for d in dmg]
            b['conditionImmunities'] += conds
        elif line.startswith('Vulnerabilities '):
            dmg, _ = parse_damage_list(line[len('Vulnerabilities '):])
            b['damageResponses'] += [{'damageType': d.upper(), 'response': 'VULNERABILITY'} for d in dmg]
        elif line.startswith('Gear '):
            for part in re.split(r',', line[len('Gear '):]):
                item = re.sub(r'\(.*?\)', '', part).strip()
                if item:
                    qty = re.search(r'\((\d+)\)', part)
                    b['gear'].append({'name': item, 'quantity': int(qty.group(1)) if qty else 1})
        elif line.startswith('Senses '):
            for s in SENSES:
                m2 = re.search(r'%s (\d+) ?ft' % s, line)
                if m2:
                    b['senses'][s.upper()] = int(m2.group(1))
            pp = re.search(r'Passive Perception (\d+)', line)
            if pp:
                b['passivePerception'] = int(pp.group(1))
        elif line.startswith('Languages '):
            b['languages'] = line[len('Languages '):].strip() or None
            tel = re.search(r'telepathy (\d+) ?ft', line, re.I)
            if tel:
                b['telepathyFeet'] = int(tel.group(1))
        elif line.startswith('CR '):
            cr = re.match(r'CR ([\d/]+)', line)
            if cr:
                v = cr.group(1)
                b['challengeRating'] = (float(v.split('/')[0]) / float(v.split('/')[1])
                                        if '/' in v else float(v))
            xp = re.search(r'XP ([\d,]+)', line)
            if xp:
                b['experiencePoints'] = int(xp.group(1).replace(',', ''))
            pb = re.search(r'PB \+(\d+)', line)
            if pb:
                b['proficiencyBonus'] = int(pb.group(1))
    if section:
        sections.append((section, feature_lines))

    ordinal = 0
    for section_name, chunk in sections:
        activation = SECTIONS[section_name]
        if section_name == 'Legendary Actions':
            joined = ' '.join(chunk)
            uses = re.search(r'Legendary Action Uses: (\d+)', joined)
            if uses:
                b['legendaryActionUses'] = int(uses.group(1))
        starts = feature_starts(chunk)
        for k, (idx, fname, rest) in enumerate(starts):
            end = starts[k + 1][0] if k + 1 < len(starts) else len(chunk)
            text = ' '.join([rest] + chunk[idx + 1:end])
            text = re.sub(r'-\s+(?=[a-z])', '', text)
            text = re.sub(r'\s+', ' ', text).strip()
            if not text:
                continue
            b['features'].append(parse_feature(fname, text, activation, ordinal))
            ordinal += 1
    return b


def main():
    lines = load_lines()
    lines = [l for l in lines if not re.match(r'^\d{1,3} System Reference Document', l)]
    starts = [i for i, l in enumerate(lines)
              if HEADER.match(l) and any(lines[k].startswith('AC ')
                                         for k in range(i + 1, min(i + 4, len(lines))))]
    blocks = []
    for n, i in enumerate(starts):
        end = starts[n + 1] - 1 if n + 1 < len(starts) else len(lines)
        blocks.append(parse_block(lines[i - 1].strip(), lines[i:end]))
    json.dump(blocks, open(OUT, 'w'), indent=1)

    feats = sum(len(b['features']) for b in blocks)
    effs = sum(len(f['effects']) for b in blocks for f in b['features'])
    print(f'stat blocks {len(blocks)}  features {feats}  effects {effs}', file=sys.stderr)
    return blocks


if __name__ == '__main__':
    main()
