export interface StatRow {
  name: string;
  base: number;
  equipmentBonus: number | null;
  mod: number | null;
  nextBaseIncreaseMod?: number | null;
  nextBaseIncreaseModIncrease?: number | null;
  lastBaseIncreaseMod?: number | null;
  lastBaseIncreaseModIncrease?: number | null;
  modWithTactics?: number | null;
  modFromAttributes?: number | null;
  modFromEquipment?: number | null;
  modFromTactics?: number | null;
  minBase: number;
  maxBase: number;
  expFactor: number;
  ptmDisabled?: boolean;
  maxingEquipmentBonus?: number;
  expCost?: number;
  visibleFor?: string[];
  attributes?: string[];
  showDetails?: boolean;
  isHidden?: boolean;
  isPinned?: boolean;
  equipmentDisabled?: boolean;
  modDisabled?: boolean;
}

export interface ProfessionRow {
  name: string;
  basePoints: number;
  points: number;
  improvePoints: number;
  max: number;
}

export const Classes = {
  Seyan: 'Seyan',
  Mage: 'Mage',
  Warrior: 'Warrior'
};

export const Stats = {
  HP: 'Hitpoints',
  ENDURANCE: 'Endurance',
  MANA: 'Mana',

  WIS: 'Wisdom',
  INT: 'Intuition',
  AGI: 'Agility',
  STR: 'Strength',

  SWORD: 'Sword',
  TWOHAND: 'Two-Handed',
  DAGGER: 'Dagger',
  STAFF: 'Staff',
  H2H: 'Hand to Hand',

  RAGE: 'Rage',
  ARMOR_SKILL: 'Armor Skill',
  ATTACK: 'Attack',
  PARRY: 'Parry',
  WARCRY: 'Warcry',
  TACTICS: 'Tactics',
  SURROUND_HIT: 'Surround Hit',
  BODY_CONTROL: 'Body Control',
  SPEED_SKILL: 'Speed Skill',

  BLESS: 'Bless',
  HEAL: 'Heal',
  FREEZE: 'Freeze',
  MAGIC_SHIELD: 'Magic Shield',
  LIGHTNING: 'Lightning',
  FIRE: 'Fire',
  PULSE: 'Pulse',
  DURATION: 'Duration',

  BARTERING: 'Bartering',
  PERCEPTION: 'Perception',
  STEALTH: 'Stealth',
  REGENERATE: 'Regenerate',
  MEDITATE: 'Meditate',
  IMMUNITY: 'Immunity',

  PROFESSION: 'Profession'
};

export const Professions = {
  LWDW: 'Light/Dark Warrior',
  CW: 'Clan Warrior',
  ATHLETE: 'Athlete',
  THIEF: 'Thief',
  ASSASSIN: 'Assassin'
};

// Clan Wars caps every base outright — there is no supermax tier to buy past it,
// so this is a hard ceiling rather than the point where points get expensive.
// The hardcore bonus is inconsistent between their three forms (+12 mage, +9
// warrior, +10 seyan); reproduced as decompiled rather than smoothed out.
export function ptmBase(Class: string, stat: StatRow, Hardcore: boolean) {
  if (Class === Classes.Seyan) {
    return Hardcore ? 110 : 100;
  }

  if (Class === Classes.Mage) {
    return Hardcore ? 127 : 115;
  }

  return Hardcore ? 124 : 115;
}

// Clan Wars values a level at 3x the experience Astonia V does.
export const ExpPerLevel = 3;

export function expToLevel(exp: number) {
  return exp <= 0 ? 1 : Math.pow(exp / ExpPerLevel, 0.25);
}

export function levelToExp(level: number) {
  return ExpPerLevel * Math.pow(level, 4);
}

// The optimizers recompute whole builds hundreds of times a second, and this loop
// is the hot spot. The cost of a row depends only on (class, minBase, base, factor),
// so it is worth remembering.
const expCache = new Map<string, number>();

export function totalExp(row: StatRow, Class: string, Hardcore: boolean) {
  const MinBase = row.minBase;
  const ExpFactor = row.expFactor;
  const Base = row.base;

  const cacheKey = `${Class}|${MinBase}|${Base}|${ExpFactor}`;
  const cached = expCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  let Exp = 0;

  for (let n = MinBase; n < Base; n++) {
    const nr = n - MinBase + 6;

    if (Class === Classes.Seyan) {
      // max(1, nr^3 * cost * 12 / 30), all integer arithmetic
      Exp += Math.max(1, Math.floor((nr * nr * nr * ExpFactor * 12) / 30));
    } else {
      // (int)(pow(nr,3) * cost / 10 * 26 / 10) - operation order kept as decompiled
      Exp += Math.trunc((Math.pow(nr, 3) * ExpFactor) / 10 * 26 / 10);
    }
  }

  expCache.set(cacheKey, Exp);

  return Exp;
}

export function maxingGear(Class: string, Base: number) {
  if (Class === Classes.Seyan) {
    return Math.floor(0.725 * Base);
  }
  return Math.floor(0.5 * Base);
}

export function maxingBless(Class: string, Base: number) {
  switch (Class) {
    case Classes.Mage:
      return Base * 2;
    case Classes.Warrior:
      return Base * 2;
    case Classes.Seyan:
      return Math.floor(Base * 2.9);
    default:
      return 0;
  }
}

export function getWeaponValue(Stat: StatRow | null) {
  if (Stat == null) return 0;
  if (Stat.base === 0) return 0;

  const weaponSkill = Math.min(Stat.base, 110);
  const weaponLevel = Math.floor(weaponSkill / 10);

  switch (Stat.name) {
    case Stats.SWORD:
      return 14 + weaponLevel * 10;
    case Stats.TWOHAND:
      return 17 + weaponLevel * 10;
    case Stats.DAGGER:
      return 11 + weaponLevel * 10;
    case Stats.STAFF:
      return 12 + weaponLevel * 10;
    default:
      return 0;
  }
}

export const SeyanSpells = [
  Stats.BLESS,
  Stats.HEAL,
  Stats.FREEZE,
  Stats.MAGIC_SHIELD,
  Stats.LIGHTNING,
  Stats.FIRE,
  Stats.PULSE
];

// Clan Wars' seyan form keys every spell off Int/Str/Wis where the mage form uses
// Int/Int/Wis, so the parent triple depends on the class, not just the skill.
export function attributesFor(Class: string, stat: StatRow): string[] | undefined {
  if (Class === Classes.Seyan && stat.attributes && SeyanSpells.includes(stat.name)) {
    return [Stats.INT, Stats.STR, Stats.WIS];
  }
  return stat.attributes;
}

export function calculateAttributeMod(attributes: string[], stats: Record<string, StatRow>): number {
  const totalMod = attributes.reduce((sum, attr) => {
    const stat = stats[attr];
    return sum + (stat?.mod ?? 0);
  }, 0);

  return Math.floor(totalMod / 5);
}

export function calculateMaxStealthVisible(perceptionMod: number, distance: number, lightModifier: number) {
  const normalizedDistance = Math.max(1, distance);
  const normalizedLight = Math.max(0, lightModifier);
  return Math.max(1, perceptionMod - Math.pow(normalizedDistance + 1, 2) + normalizedLight);
}

export function minimumStealthToAvoidDetection(perceptionMod: number, lightModifier: number, distance = 1) {
  return calculateMaxStealthVisible(perceptionMod, distance, lightModifier) + 1;
}
