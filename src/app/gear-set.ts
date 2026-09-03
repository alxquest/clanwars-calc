import { Classes, Stats } from './stat-calculator';

// The 11 modifiable worn slots. The right hand holds a torch on this server and
// cannot be modified, so it is not here. Two rings, kept as separate slots.
export const GearSlots = [
  'Ring 1',
  'Weapon',
  'Ring 2',
  'Amulet',
  'Hat',
  'Cape',
  'Chest',
  'Belt',
  'Sleeves',
  'Pants',
  'Boots'
];

// Version 1 tokens were written in the old slot order, so they must be read in it.
const GearSlotsV1 = [
  'Amulet',
  'Hat',
  'Cape',
  'Chest',
  'Sleeves',
  'Belt',
  'Pants',
  'Boots',
  'Weapon',
  'Ring 1',
  'Ring 2'
];

// Inventory icons lifted from the game's own sprites.
export const SlotIcons: Record<string, string> = {
  'Ring 1': 'gear/ring.png',
  'Ring 2': 'gear/ring.png',
  Weapon: 'gear/weapon.png',
  Amulet: 'gear/amulet.png',
  Hat: 'gear/hat.png',
  Cape: 'gear/cape.png',
  Chest: 'gear/chest.png',
  Belt: 'gear/belt.png',
  Sleeves: 'gear/sleeves.png',
  Pants: 'gear/pants.png',
  Boots: 'gear/boots.png'
};

// Pieces carrying no armour value. Seyan sets want their dear stats here.
export const SoftSlots = ['Ring 1', 'Ring 2', 'Amulet', 'Cape', 'Belt'];

// Obols per point, by stat. A stat absent from this table cannot appear on gear.
export const ObolCosts: Record<string, number> = {
  [Stats.PERCEPTION]: 1,
  [Stats.STEALTH]: 1,
  [Stats.BLESS]: 1,
  [Stats.SURROUND_HIT]: 1,
  [Stats.SPEED_SKILL]: 1,
  [Stats.DURATION]: 1,
  [Stats.RAGE]: 1,

  [Stats.WIS]: 2,
  [Stats.INT]: 2,
  [Stats.AGI]: 2,
  [Stats.STR]: 2,
  [Stats.WARCRY]: 2,
  [Stats.TACTICS]: 2,
  [Stats.BODY_CONTROL]: 2,
  [Stats.PULSE]: 2,
  [Stats.FREEZE]: 2,

  [Stats.DAGGER]: 3,
  [Stats.H2H]: 3,
  [Stats.STAFF]: 3,
  [Stats.SWORD]: 3,
  [Stats.TWOHAND]: 3,
  [Stats.ATTACK]: 3,
  [Stats.PARRY]: 3,
  [Stats.MAGIC_SHIELD]: 3,
  [Stats.LIGHTNING]: 3,
  [Stats.FIRE]: 3,

  [Stats.IMMUNITY]: 4
};

// Share tokens carry a stat as its index in THIS list, so its order must never
// change - re-sorting it would silently repoint every link ever made. The
// display order is a separate concern; see GearStats.
const GearStatCodes = Object.keys(ObolCosts);

// Stats that can be rolled on a piece, alphabetically, for the dropdowns.
export const GearStats = [...GearStatCodes].sort((a, b) => a.localeCompare(b));

// The implicit line is always one of the three vitals.
export const ImplicitStats = [Stats.HP, Stats.ENDURANCE, Stats.MANA];

export const MaxStatLine = 20;
export const MaxImplicit = 10;
export const MaxMirrored = 5;
export const StatLinesPerPiece = 3;
export const OrbGoldCost = 2000;
export const OrbExpCost = 5000000;

export interface GearLine {
  stat: string;
  value: number;
  // Level 101+ gear can mirror an existing line for up to another +5. Paid for
  // with PTM orbs and, like the special, it ignores the gear allowance.
  mirrored: number;
}

export interface GearPiece {
  slot: string;
  lines: GearLine[];
  implicitStat: string;
  implicitValue: number;
  specialStat: string;
  // Kept so older share links keep their field widths; mirroring is no longer
  // gated on it.
  highLevel: boolean;
}

export interface GearSet {
  id: string;
  name: string;
  useSU: boolean;
  useGU: boolean;
  pieces: GearPiece[];
}

export interface SetTotals {
  // Ordinary gear bonuses, still subject to the maxing-gear allowance.
  equipment: Record<string, number>;
  // Implicit, special and mirrored all behave like PTM: they ignore the allowance.
  ptm: Record<string, number>;
  obols: number;
  obolsByStat: Record<string, number>;
  ptmOrbs: number;
  gold: number;
  exp: number;
}

export function emptyPiece(slot: string): GearPiece {
  return {
    slot,
    lines: Array.from({ length: StatLinesPerPiece }, () => ({ stat: '', value: 0, mirrored: 0 })),
    implicitStat: '',
    implicitValue: 0,
    specialStat: '',
    highLevel: false
  };
}

export function emptySet(name = 'New Set'): GearSet {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    useSU: false,
    useGU: false,
    pieces: GearSlots.map(emptyPiece)
  };
}

function clamp(value: number, min: number, max: number): number {
  const n = Math.round(Number(value) || 0);
  return Math.min(max, Math.max(min, n));
}

/**
 * Silver and gold units each hand a piece a free +1 on every stat it carries,
 * once. They do not change what the line gives you - only what it costs.
 */
export function freePoints(set: GearSet): number {
  if (!set.useSU) {
    return 0;
  }
  // Gold units require the piece to have been silvered first.
  return set.useGU ? 2 : 1;
}

export function calculateSetTotals(set: GearSet): SetTotals {
  const equipment: Record<string, number> = {};
  const ptm: Record<string, number> = {};
  const obolsByStat: Record<string, number> = {};
  const free = freePoints(set);

  let obols = 0;
  let ptmOrbs = 0;

  const add = (bucket: Record<string, number>, stat: string, amount: number) => {
    if (!stat || !amount) {
      return;
    }
    bucket[stat] = (bucket[stat] ?? 0) + amount;
  };

  set.pieces.forEach(piece => {
    piece.lines.forEach(line => {
      if (!line.stat) {
        return;
      }

      const value = clamp(line.value, 0, MaxStatLine);
      if (value > 0) {
        add(equipment, line.stat, value);

        const rate = ObolCosts[line.stat] ?? 0;
        const paidPoints = Math.max(0, value - free);
        const cost = paidPoints * rate;
        obols += cost;
        add(obolsByStat, line.stat, cost);
      }

      // Mirroring only applies to a line the piece already has.
      if (value > 0) {
        const mirrored = clamp(line.mirrored, 0, MaxMirrored);
        if (mirrored > 0) {
          add(ptm, line.stat, mirrored);
          ptmOrbs += mirrored;
        }
      }
    });

    // The implicit is inherent to the piece: no obols, no orbs.
    if (piece.implicitStat) {
      add(ptm, piece.implicitStat, clamp(piece.implicitValue, 0, MaxImplicit));
    }

    if (piece.specialStat) {
      add(ptm, piece.specialStat, 1);
      ptmOrbs += 1;
    }
  });

  return {
    equipment,
    ptm,
    obols,
    obolsByStat,
    ptmOrbs,
    gold: ptmOrbs * OrbGoldCost,
    exp: ptmOrbs * OrbExpCost
  };
}

// ---------------------------------------------------------------------------
// Share tokens, same shape as the build ones: fixed-width base-36 fields in a
// known order so nothing has to carry a key.
// ---------------------------------------------------------------------------

const SET_VERSION = '2';

function enc(value: number, width: number): string {
  return Math.max(0, Math.round(value || 0)).toString(36).padStart(width, '0').slice(-width);
}

function dec(text: string, fallback: number): number {
  const value = parseInt(text, 36);
  return Number.isFinite(value) ? value : fallback;
}

// Stats travel as their index in GearStats / ImplicitStats, so a rename of a
// display string does not break existing links. "None" is any index past the end
// of the list, which has to still fit the field it is written into.
function statIndex(list: string[], stat: string, none: number): number {
  const index = list.indexOf(stat);
  return index < 0 ? none : index;
}

function statAt(list: string[], index: number): string {
  return list[index] ?? '';
}

export function serializeSet(set: GearSet): string {
  const flags = (set.useSU ? 1 : 0) | (set.useGU ? 2 : 0);
  const header = SET_VERSION + enc(flags, 1);

  const pieces = set.pieces.map(piece => {
    const lines = piece.lines
      .map(line => enc(statIndex(GearStatCodes, line.stat, 63), 2) + enc(line.value, 1) + enc(line.mirrored, 1))
      .join('');

    return lines
      + enc(statIndex(ImplicitStats, piece.implicitStat, 9), 1)
      + enc(piece.implicitValue, 1)
      + enc(statIndex(GearStatCodes, piece.specialStat, 63), 2)
      + (piece.highLevel ? '1' : '0');
  }).join('');

  return [header, pieces, encodeURIComponent(set.name || '')].join('-');
}

export function parseSet(token: string): GearSet | null {
  try {
    const parts = token.split('-');
    if (parts.length < 2) {
      return null;
    }

    const [header, pieces, ...nameParts] = parts;
    // v1 differs only in the slot order it was written in.
    if (header.charAt(0) !== '1' && header.charAt(0) !== SET_VERSION) {
      return null;
    }

    const set = emptySet();
    const flags = dec(header.charAt(1), 0);
    set.useSU = !!(flags & 1);
    set.useGU = !!(flags & 2);

    // 3 lines x 4 chars, then implicit stat + value, special stat, high-level flag
    const pieceWidth = StatLinesPerPiece * 4 + 1 + 1 + 2 + 1;

    const order = header.charAt(0) === '1' ? GearSlotsV1 : GearSlots;

    set.pieces = order.map((slot, index) => {
      const piece = set.pieces.find(entry => entry.slot === slot) ?? emptyPiece(slot);
      const chunk = pieces.slice(index * pieceWidth, (index + 1) * pieceWidth);
      if (chunk.length < pieceWidth) {
        return piece;
      }

      const lines = piece.lines.map((_, i) => {
        const field = chunk.slice(i * 4, i * 4 + 4);
        return {
          stat: statAt(GearStatCodes, dec(field.slice(0, 2), 63)),
          value: clamp(dec(field.charAt(2), 0), 0, MaxStatLine),
          mirrored: clamp(dec(field.charAt(3), 0), 0, MaxMirrored)
        };
      });

      const rest = chunk.slice(StatLinesPerPiece * 4);

      return {
        ...piece,
        lines,
        implicitStat: statAt(ImplicitStats, dec(rest.charAt(0), 9)),
        implicitValue: clamp(dec(rest.charAt(1), 0), 0, MaxImplicit),
        specialStat: statAt(GearStatCodes, dec(rest.slice(2, 4), 63)),
        highLevel: rest.charAt(4) === '1'
      };
    });

    // Back into the order the UI shows, whichever order the token used.
    set.pieces = GearSlots.map(slot => set.pieces.find(piece => piece.slot === slot) ?? emptyPiece(slot));

    const name = decodeURIComponent(nameParts.join('-'));
    if (name) {
      set.name = name;
    }

    return set;
  } catch (error) {
    console.error('Unable to read set token', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Quick build: turn "3 lightning, 3 magic shield, 2 bless..." into a laid-out set.
// ---------------------------------------------------------------------------

export interface QuickDemand {
  stat: string;
  count: number;
}

// Stats that want to share a piece. Immunity sits in both fighting and casting
// groups on purpose - it pairs happily with either.
const AffinityGroups: string[][] = [
  [Stats.WIS, Stats.INT, Stats.AGI, Stats.STR],
  [Stats.ATTACK, Stats.PARRY, Stats.IMMUNITY],
  [Stats.LIGHTNING, Stats.FIRE, Stats.MAGIC_SHIELD, Stats.IMMUNITY]
];

function affinity(a: string, b: string): number {
  return AffinityGroups.filter(group => group.includes(a) && group.includes(b)).length;
}

/**
 * The order pieces get filled. Dear stats should land on pieces that carry no
 * armour value in a warrior/seyan set, and the weapon is always the last resort.
 */
export function fillOrder(className: string): string[] {
  const weaponLast = (slots: string[]) => [...slots.filter(s => s !== 'Weapon'), 'Weapon'];

  if (className === Classes.Mage) {
    return weaponLast(GearSlots);
  }

  const soft = GearSlots.filter(slot => SoftSlots.includes(slot));
  const hard = GearSlots.filter(slot => !SoftSlots.includes(slot) && slot !== 'Weapon');
  return weaponLast([...soft, ...hard]);
}

export function quickBuildCapacity(): number {
  return GearSlots.length * StatLinesPerPiece;
}

/**
 * Lay demands out across the pieces. Each demand is a stat and how many pieces
 * should carry it, every placed line rolled at the maximum.
 */
export function buildQuickSet(demands: QuickDemand[], className: string, name = 'Quick set'): GearSet {
  const set = emptySet(name);
  const order = fillOrder(className);
  const byName = new Map(set.pieces.map(piece => [piece.slot, piece]));

  const remaining = demands
    .filter(d => d.stat && d.count > 0)
    .map(d => ({ stat: d.stat, left: Math.min(d.count, GearSlots.length) }))
    // Dearest first, so the expensive stats reach the pieces filled earliest.
    .sort((a, b) => (ObolCosts[b.stat] ?? 0) - (ObolCosts[a.stat] ?? 0) || b.left - a.left);

  order.forEach(slot => {
    const piece = byName.get(slot);
    if (!piece) {
      return;
    }

    const placed: string[] = [];

    for (let lineIndex = 0; lineIndex < StatLinesPerPiece; lineIndex++) {
      // A piece can only carry one of any given stat.
      const options = remaining.filter(entry => entry.left > 0 && !placed.includes(entry.stat));
      if (!options.length) {
        break;
      }

      const best = options.reduce((winner, entry) => {
        const score = (candidate: { stat: string; left: number }) => {
          const mates = placed.reduce((sum, stat) => sum + affinity(candidate.stat, stat), 0);
          const rate = ObolCosts[candidate.stat] ?? 0;
          // Closeness in price only matters once something is on the piece.
          const priceFit = placed.length
            ? -Math.abs(rate - (ObolCosts[placed[0]] ?? rate))
            : rate;
          return mates * 100 + priceFit * 10 + candidate.left;
        };
        return score(entry) > score(winner) ? entry : winner;
      }, options[0]);

      piece.lines[lineIndex] = { stat: best.stat, value: MaxStatLine, mirrored: 0 };
      placed.push(best.stat);
      best.left -= 1;
    }
  });

  return set;
}

/**
 * The base a stat needs for its gear allowance to swallow this much equipment.
 * Mages and warriors get half their base, seyans 0.725 of it.
 */
export function baseToUseGear(total: number, className: string): number {
  if (total <= 0) {
    return 0;
  }
  return className === Classes.Seyan ? Math.ceil(total / 0.725) : total * 2;
}
