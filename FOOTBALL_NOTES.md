# DraftKit — both sports (baseball + football)

DraftKit now supports **two sports**, switchable from a toggle in the header
(next to the view/edit/draft mode selector). The choice is remembered per
browser.

| | Baseball (MLB) | Football (NFL) |
|---|---|---|
| Player/team data | Deno server (`baseball-data.deno.dev`) | Fetched **directly from ESPN in the browser** — no backend |
| Projections | FanGraphs (via the server) | ESPN projected stats, scored as **PPR** in the browser |
| Expert ranks | FantasyPros (via the server) | Derived from ESPN's own draft ranking (no FantasyPros client-side) |
| Rankings storage | localStorage + optional server sharing (PIN) | **localStorage only** (no sharing backend) |

Everything else — view/edit/draft modes, drag-to-rank, notes, custom
projections, the draft board, starters tracker and team chart — works the same
in both sports.

## Architecture

Each sport is a single config object under `client/src/features/sports/`
(`baseball.js`, `football.js`) describing its positions, stat formatting and
quality thresholds, stat columns/groups, position filters, draft settings and
data source. `registry.js` tracks the active sport; `data/sportContext.tsx`
provides it to the app and re-mounts the data tree on switch so players, teams,
rankings and stat prefs reload cleanly. The shared helper modules
(`features/stats`, `features/positions`, `features/filtering/columns`) just
delegate to the active config, so components stay sport-agnostic.

localStorage is namespaced per sport (baseball keeps the legacy unprefixed keys;
football keys are prefixed `football_`), so the two sports never collide.

## Football data comes straight from ESPN (caveats)

`client/src/features/sports/footballEspn.js` fetches NFL teams and the player
pool from ESPN's public read API and builds players in the browser. Two things
to know:

- **CORS.** This relies on ESPN allowing browser requests. It works from public
  read endpoints today, but if a future ESPN change blocks it, those two fetches
  are the only place to route through a small proxy. The app shows a clear error
  state if the fetch fails.

## FantasyPros expert ranks (FPRO column)

FantasyPros can't be fetched from the browser (no CORS), so its PPR ECR is
bundled as a snapshot. To refresh it, run — from a machine that can reach
fantasypros.com:

```
cd client && npm run fetch:ecr
```

That writes `client/src/features/sports/data/fantasyprosEcr.json`, which the
app matches to ESPN players by name to fill the FPRO column and positional
ranks. Commit the JSON and redeploy; the snapshot's timestamp is part of the
player cache key, so the refreshed ranks show up on next load. The pool is also
capped to the top ~250 draftable players for responsiveness.
- **Stat IDs.** The ESPN football stat/slot/position maps in `footballEspn.js`
  use the community-known values (unverifiable from the build environment).
  After first load, spot-check a couple of known players; if a stat looks off,
  that file is the one place to correct it.

## The Deno server is baseball-only

`server/` is the baseball data server (ESPN + FanGraphs + FantasyPros), deployed
at `baseball-data.deno.dev`. Football needs no server. Override the baseball API
base URL with `VITE_API_URL` if you deploy it elsewhere.

## Running

```
# Baseball server (optional — a deployed instance already backs baseball)
cd server && deno run --allow-net --unstable-kv main.ts

# Client (serves both sports)
cd client && npm install && npm run dev
```
