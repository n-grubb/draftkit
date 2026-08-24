# DraftKit — Football (NFL) setup notes

This branch converts the baseball DraftKit into a **fantasy football** draft
kit. Data comes from **ESPN** (player pool, positions, ownership, ADP, and
projected/prior-season stats) and **FantasyPros** (PPR expert consensus
rankings + ADP). FanGraphs (baseball-only) has been removed.

Scoring is **PPR** (1 point per reception). Fantasy points (`FPTS`) are
computed on the server from raw ESPN stats using the weights in
`server/constants.ts → PPR_SCORING`, so they don't depend on which ESPN
league's scoring the request uses. Kicker and D/ST points use ESPN's own
projected total (their distance/points-allowed tiers aren't captured by flat
weights).

## Running it

**Server** (Deno + Hono + KV), from `server/`:

```
deno run --allow-net --unstable-kv main.ts
```

Then populate the KV store once (and whenever you want fresh data):

```
curl http://localhost:8000/admin/refresh
```

**Client** (Vite + React), from `client/`:

```
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

The client's data API base URL lives in `client/src/data/config.ts` and is
overridable with `VITE_API_URL`. Its default (`https://football-data.deno.dev`)
is a placeholder — point it at wherever you deploy the Deno server.

## Verifying ESPN data (important)

The ESPN fantasy football API is undocumented. The slot IDs, position IDs and
**stat IDs** the server relies on are centralized in `server/constants.ts`
(`SLOT_IDS`, `POSITION_MAP`, `ESPN_STAT_MAP`). These use the community-known
mappings, but they were **not** verifiable from the environment this was built
in (ESPN was blocked by network policy). After your first `/admin/refresh`,
spot-check a few known players — if a stat looks wrong, the mapping in
`constants.ts` is the first place to correct.

`ESPN_PLAYERS_URL` uses a public read league (`leagues/0`) to pull the whole
player pool. Your own league (`leagueId=228717`) is private and not required
for the draft kit — it would only be needed to read league-specific settings,
which requires ESPN login cookies (`espn_s2` / `SWID`).

## What changed

- **Server:** `constants.ts` (NFL slots/positions/stats + PPR), `espn.ts`
  (NFL teams + `ffl` players + projections/actuals), `formatters.ts`
  (football positions, stat extraction, PPR points), `fantasypros.ts` (NFL PPR
  positions), `routes/admin.ts` (ESPN-sourced projections, FanGraphs removed).
- **Client:** `features/positions.ts`, `features/stats.ts`,
  `features/filtering/columns.ts` (QB/RB/WR/TE/K/DST, football stat columns,
  benchmarks); stats-prefs, filter bar, player list/card/item, draft board,
  starters tracker and team-output chart all footballized; data API centralized
  in `data/config.ts`.
