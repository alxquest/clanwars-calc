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
