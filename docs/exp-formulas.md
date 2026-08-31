# Clan Wars formulas

Recovered by decompiling `A3ClanWars.exe`, a .NET single-file WinForms build of the Clan
Wars stat calculator (sources kept in `../../clanwars/decompiled/`). Astonia V's own
values are shown alongside for contrast — this calculator implements the **Clan Wars**
column.

## Experience

For a stat raised from base `n` to `n+1`:

```
nr = n - start + 6          # start = 10 for Hitpoints/Endurance/Mana/attributes, else 1
f  = cost factor            # 3 = Hitpoints/Endurance/Mana/Profession, 2 = attributes, 1 = skills
```

| | Clan Wars | Astonia V (`skill.c`) |
| --- | --- | --- |
| Mage / warrior point cost | `floor(nr³ · f · 26/100)` | `max(1, nr³ · f / 10)` |
| Seyan point cost | `max(1, nr³ · f · 12/30)` | `max(1, nr³ · f · 4/30)` |
| Level from experience | `(exp / 3) ^ ¼` | `floor(exp ^ ¼)` |
| Past the base cap | nothing — the cap is hard | `supermax_cost()` adds 3,000,000 |

Points are 2.6x (3x for seyan) dearer in Clan Wars, but a level is worth 3x the
experience, so the two effects almost cancel. Net purchasing power at a given level:

- **Mage / warrior:** `3 / 2.6` = **1.154x** an Astonia V character of the same level.
- **Seyan:** `3 / 3` = **exactly the same** as Astonia V.

The whole change is a class rebalance — mages and warriors get ~15% more stats per level
while seyans are untouched, narrowing the seyan lead. It is not a grind adjustment.

## Caps

| | Normal | Hardcore |
| --- | ---: | ---: |
| Mage | 115 | 127 |
| Warrior | 115 | 124 |
| Seyan | 100 | 110 |

The hardcore bonus is inconsistent between their three forms (+12 / +9 / +10). That is
reproduced as decompiled rather than smoothed out — Astonia V uses a flat +7.

Profession points cap at 100; Clan Warrior, Athlete and Thief cap at 30 each. Equipment
can add `floor(0.5 · base)` (`floor(0.725 · base)` for seyan), and bless fills the same
allowance rather than stacking on top of it — except for mages, where bless is added on
top of gear.

## Mods

```
attribute mod = base + clanWarriorPoints + equipment + PTM + bless
skill mod     = base + min(sum(parents) / 5, max(15, base · 2)) + equipment + PTM + profession
```

Parent attributes match Astonia V's `skill[]` table with one exception: the **seyan** form
keys every spell off `Int/Str/Wis` where the mage form uses `Int/Int/Wis`. Mages also add
`clanWarriorPoints / 15` to Immunity, Fire, Lightning, Freeze, Pulse, Magic Shield,
Dagger, Staff and Hand-to-Hand. Thief points add fully to Stealth and half to Perception.

Class skill lists: mages have no Regenerate, warriors no Meditate, seyans neither Rage
nor Duration.

## Combat

`weapon` below is the highest weapon **mod** the class can use — dagger/h2h/staff for
mages, sword/two-handed/dagger/h2h otherwise.

| | Mage | Warrior | Seyan |
| --- | --- | --- | --- |
| Offense | `weapon + spellAvg·2 − ⌊level⌋` | `weapon + attack·2 + tactics + rage` | `weapon + attack·2 + tactics` |
| Defense | `weapon + magicShield·2` | `weapon + parry·2 + tactics + rage` | `weapon + parry·2 + tactics` |
| Surround offense | — | `weapon + (surround·2 − 12) + tactics + rage` | same as warrior |
| Tactics bonus | — | `(tactics − 20)/3 + 20` | `tactics · 0.375` |
| Rage bonus | — | `rage / 7` | — |
| Armor value | `spellAvg · 17.5 / 20` | `bodyControl/4 + (armorSkill−1)/4 + ⌊armorSkill/10⌋·5.5 + 14` | same as warrior |
| Speed | `(agi·2 + str)/5 + athlete·3 + 40` | `… + speedSkill/2 + athlete·3 + 40` | same as warrior |

`spellAvg` is the sum of Bless, Heal, Freeze, Magic Shield, Lightning, Fire and Pulse
divided by **8** — seven spells over eight, as the server itself does it.

Weapon value is `bodyControl/4` plus, for an armed character, a base by weapon type
(sword 14, two-handed 17, dagger 11, staff 12) plus `⌊min(base,110)/10⌋ · 10`. Unarmed
replaces the weapon term with `min(90, bodyControl/2)`. The mage form only prices dagger
and staff, so a mage whose best weapon skill is hand-to-hand reads 0 — reproduced as-is.

Tactics feeds back into skills while the tactics toggle is on: warriors get
`⌊tactics/8⌋` on Warcry and `⌊(tactics + 14)·11/80⌋` on Immunity; seyans get
`⌊tactics/8⌋` on Lightning, Fire, Pulse, Freeze and Warcry, and `⌊(tactics + 14)/8⌋` on
Immunity. Mages have no Tactics skill.

## Verified

Each class was checked against an independent reimplementation of the decompiled C#.
All values agree exactly:

| Build | Experience | Level | Off | Def | Surround | Weapon | Armor | Speed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Warrior | 4,062,357 | 34.11255 | 277 | 267 | 225 | 79 | 44.75 | 97 |
| Mage | 9,894,291 | 42.61533 | 236 | 323 | — | 62 | 80 | 111 |
| Seyan | 15,969,073 | 48.03299 | 506 | 488 | 422 | 104 | 68.00 | 146 |

## Carried over from the Astonia V calculator

This app began as a fork of an Astonia V calculator, and a few features have no Clan Wars
counterpart in the decompiled source: the build optimizers, the stealth/perception
visibility tables, and the speed-break table. They now run on Clan Wars numbers, but
their own rules were never verified against a Clan Wars server. The duration readouts the
Clan Wars forms show (self-bless, freeze and flash timers, endurance cost per swing,
magic-shield value) have no place in this UI and are not displayed.
