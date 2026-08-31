# Astonia V Stat Calculator

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
