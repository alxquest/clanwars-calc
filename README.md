# Clan Wars Stat Calculator

Character stat / experience planner for the **Clan Wars** server. Angular 18 single-page app, no
backend — it builds to a folder of static files, which is why it can live on GitHub Pages.

Forked from [alxquest/StatCalc2024](https://github.com/alxquest/StatCalc2024), with the
Astonia V math replaced by Clan Wars' own.

## Local development

```bash
npm install
npm start
```

Then open <http://localhost:4200/>.

## Build

```bash
npm run build:pages
```

Output lands in `dist/clanwars-calc/browser/`. The `build:pages` script passes
`--base-href ./`, so the same build works at a domain root *and* under a
`/<repo-name>/` path — no rebuild needed if the repo is renamed.

## Publishing to GitHub Pages

1. Push this directory to its own GitHub repository (`main` branch).
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab).

`.github/workflows/deploy-pages.yml` runs `npm ci`, builds, copies `index.html` to
`404.html` as a SPA fallback, and deploys. The site appears at
`https://<user>.github.io/<repo>/`.

`public/.nojekyll` stops Pages from running Jekyll over the build output (which would
otherwise drop Angular's hashed `_`-prefixed files).

## Set maker

A second mode (the tabs under the header) for building gear sets across the 11 modifiable
worn slots — the right hand holds a torch on this server and is not one of them.

Each piece carries three stat lines up to +20, one HP/Endurance/Mana implicit from +1 to
+10, and one "special" +1 in any stat. Pieces marked **101+** can mirror any line they
already have for up to another +5. The three stat lines are ordinary gear and are still
clamped by the wearer's gear allowance; the implicit, the special and mirrored points all
behave like PTM and ignore it.

Costs, tallied live:

- **Obols** for the stat lines, at 1/2/3/4 per point depending on the stat (see
  `ObolCosts` in `src/app/gear-set.ts`).
- **Silver and gold units** each hand every stat line on a piece a free +1, so they come
  off the bill rather than adding to the stat — a +20 immunity line with both costs
  18 x 4 = 72 obols. GU needs the piece silvered first.
- **PTM orbs** for specials and mirrored points, one per point, at 2,000 gold and
  5,000,000 experience each. Implicits are free.

Bulk tools set every special or implicit to one stat, set every implicit's value at once,
clear all specials, mirror every filled line at +5, or clear mirrored points across the
set or on one piece.

A build wears a set through the "Gear set" picker, or stays on **Custom** and keeps its
own typed equipment and PTM — those values are stashed while a set is worn and come back
untouched when you switch back. Sets have their own `?s=` share links.

## Share links

`?b=` carries a build as fixed-width base-36 fields in the stat rows' own order, so no
keys travel with it: a header (version, class, speed mode, toggle bitmask), then bases,
then only the non-zero PTM entries, then professions, then the name. A full level-34
build comes to about 90 characters of token — roughly 130 including the URL, against
2,400 for the base64-JSON tokens it replaces.

Per-stat equipment values are deliberately not carried; the "maxing equipment" toggle is,
which covers the usual case. Older `?build=` links still load.

## Stale caches after a redeploy

The JS and CSS filenames are content-hashed, so browsers pick those up on their own. The
file that does get cached is `index.html` — GitHub Pages serves it with a short max-age,
so a returning visitor can boot a stale shell pointing at the previous bundle.

`src/index.html` carries a small guard for that: on load it re-fetches `index.html` with
`cache: 'no-store'` and compares the bundle name the server is serving against the one
the page actually loaded. If they differ it reloads once, guarded by a `sessionStorage`
flag so a stale CDN edge can't put the tab in a reload loop. Nobody has to be told to
clear their cache.

## Formula sources

The math is the **Clan Wars** server's, recovered by decompiling their own calculator
(`A3ClanWars.exe`) rather than guessed. See [`docs/exp-formulas.md`](docs/exp-formulas.md)
for the formulas written out, the Astonia V comparison, and the numbers each class was
verified against.

Point costs, the level curve, base caps, equipment and bless allowances, offense/defense,
weapon and armor value, speed, and the tactics and rage feedback all follow the
decompiled `MageForm` / `WarrForm` / `SeyanForm`. Two inconsistencies in their calculator
are reproduced deliberately rather than corrected: the hardcore cap bonus differs per
class (+12 mage, +9 warrior, +10 seyan), and a mage whose best weapon skill is
hand-to-hand reads a weapon value of 0.
