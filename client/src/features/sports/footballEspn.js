// Client-side ESPN fetch + transform for football.
//
// Football runs without a backend: the browser fetches the NFL player universe
// and pro teams straight from ESPN's public read API and builds the same Player
// shape the rest of the app expects. Fantasy points are computed with PPR
// weights. Expert (FantasyPros) ranks aren't available client-side, so
// positional ranks are derived from ESPN's own draft ranking.
//
// NOTE: this relies on ESPN returning permissive CORS headers to the browser.
// If a future ESPN change blocks that, these two fetches are the only place to
// route through a small proxy.

const SEASON = 2026

const ESPN_TEAMS_URL = 'https://site.web.api.espn.com/apis/site/v2/teams?region=us&lang=en&leagues=nfl'
// Game-level player universe (no league needed) with the kona_player_info view,
// which includes projected + prior-season stat splits.
const ESPN_PLAYERS_URL = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}/players?scoringPeriodId=0&view=kona_player_info`

// ESPN lineup slot IDs -> position abbreviations
const POSITION_MAP = { 0: 'QB', 2: 'RB', 4: 'WR', 6: 'TE', 16: 'DST', 17: 'K' }
const DEFAULT_POSITION_MAP = { 1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'DST' }
// Slots that are not real, filterable positions
const IGNORED_SLOTS = new Set([1, 3, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 19, 20, 21, 23])

// ESPN football stat IDs -> our stat keys
const STAT_MAP = {
    PATT: 0, CMP: 1, PYDS: 3, PTD: 4, INT: 20,
    CAR: 23, RYDS: 24, RTD: 25,
    REC: 53, RECYDS: 42, RECTD: 43, TGT: 58, FUML: 72,
    FGM: 83, FGA: 84, XPM: 86,
    SACK: 99, DINT: 95, FR: 96, DTD: 93, SFTY: 98, PA: 120, YDA: 127,
}

const PPR_SCORING = {
    PYDS: 0.04, PTD: 4, INT: -2,
    RYDS: 0.1, RTD: 6,
    REC: 1, RECYDS: 0.1, RECTD: 6, FUML: -2,
    FGM: 3, XPM: 1,
    SACK: 1, DINT: 2, FR: 2, DTD: 6, SFTY: 2,
}

const FETCH_HEADERS = {
    'x-fantasy-filter': JSON.stringify({
        players: {
            filterSlotIds: { value: [0, 2, 4, 6, 16, 17] },
            sortDraftRanks: { sortPriority: 100, sortAsc: true, value: 'PPR' },
            sortPercOwned: { sortPriority: 1, sortAsc: false },
            limit: 1500,
        },
    }),
}

function positionsFromSlots(eligibleSlots, defaultPositionId) {
    const positions = (eligibleSlots || [])
        .filter(slot => !IGNORED_SLOTS.has(slot))
        .map(slot => POSITION_MAP[slot])
        .filter(Boolean)
    const unique = [...new Set(positions)]
    if (unique.length === 0 && DEFAULT_POSITION_MAP[defaultPositionId]) {
        return [DEFAULT_POSITION_MAP[defaultPositionId]]
    }
    return unique
}

function primaryPosition(eligibleSlots, defaultPositionId) {
    if (DEFAULT_POSITION_MAP[defaultPositionId]) return DEFAULT_POSITION_MAP[defaultPositionId]
    return positionsFromSlots(eligibleSlots, defaultPositionId)[0] || 'FLEX'
}

function computeStatLine(rawStats, position, appliedTotal) {
    const line = {}
    for (const [key, id] of Object.entries(STAT_MAP)) {
        const value = rawStats[id]
        if (value != null) line[key] = value
    }
    let fpts = 0
    for (const [key, weight] of Object.entries(PPR_SCORING)) {
        if (line[key] != null) fpts += line[key] * weight
    }
    if ((position === 'DST' || position === 'K') && typeof appliedTotal === 'number') {
        fpts = appliedTotal
    }
    line.FPTS = Math.round(fpts * 10) / 10
    return line
}

function yearlyStats(statEntries, position) {
    const out = {}
    if (!Array.isArray(statEntries)) return out
    for (const entry of statEntries) {
        if (entry?.statSplitTypeId !== 0) continue
        if (entry?.statSourceId !== 0) continue
        if (!entry.seasonId || !entry.stats) continue
        out[entry.seasonId] = computeStatLine(entry.stats, position, entry.appliedTotal)
    }
    return out
}

function projection(statEntries, position) {
    if (!Array.isArray(statEntries)) return {}
    const entry = statEntries.find(
        (e) => e?.statSourceId === 1 && e?.statSplitTypeId === 0 && e?.seasonId === SEASON
    )
    if (!entry?.stats) return {}
    return computeStatLine(entry.stats, position, entry.appliedTotal)
}

function buildHeadshot(id, position, team) {
    if (position === 'DST') return team?.logo || ''
    return `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${id}.png&w=426&h=320&cb=1`
}

export async function fetchFootballTeams() {
    const res = await fetch(ESPN_TEAMS_URL)
    if (!res.ok) throw new Error(`ESPN teams request failed (${res.status})`)
    const data = await res.json()

    const teams = []
    teams[0] = { id: 0, abbrev: 'FA', name: 'Free Agent', location: null, logo: null, color: null }

    const leagueTeams = data?.sports?.[0]?.leagues?.[0]?.teams ?? []
    for (const entry of leagueTeams) {
        const t = entry.team
        if (!t) continue
        const id = Number(t.id)
        teams[id] = {
            id,
            abbrev: t.abbreviation,
            name: t.name ?? t.displayName ?? t.abbreviation,
            location: t.location ?? null,
            logo: t.logos?.[0]?.href ?? null,
            color: t.color ? `#${t.color}` : null,
        }
    }
    return teams
}

export async function fetchFootballPlayers(teams) {
    const teamList = teams || (await fetchFootballTeams())
    const res = await fetch(ESPN_PLAYERS_URL, { headers: FETCH_HEADERS })
    if (!res.ok) throw new Error(`ESPN players request failed (${res.status})`)
    const data = await res.json()

    // The game-level /players endpoint returns a bare array of player objects;
    // the league kona_player_info view wraps each as { id, player: {...} }.
    // Normalize both shapes.
    const rawList = Array.isArray(data) ? data : (data.players || [])

    const players = rawList.map((entry) => {
        const p = entry.player || entry
        const id = entry.id ?? p.id
        const pos = primaryPosition(p.eligibleSlots, p.defaultPositionId)
        const positions = positionsFromSlots(p.eligibleSlots, p.defaultPositionId)
        const rawStats = p.stats ?? []
        const team = teamList[p.proTeamId]
        const espnRank = p.draftRanksByRankType?.PPR?.rank ?? p.draftRanksByRankType?.STANDARD?.rank ?? null

        return {
            id,
            name: p.fullName,
            firstName: p.firstName,
            lastName: p.lastName,
            team_id: p.proTeamId,
            pos: positions,
            stats: yearlyStats(rawStats, pos),
            projections: projection(rawStats, pos),
            headshot: buildHeadshot(id, pos, team),
            ownership: p.ownership?.percentOwned || 0,
            averageDraftPosition: p.ownership?.averageDraftPosition || null,
            percentChange: p.ownership?.percentChange || null,
            injuryStatus: p.injuryStatus || null,
            age: null,
            birthDate: null,
            espnRank,
            fantasyProsRank: null,
            fantasyProsPositionalRank: null,
        }
    })

    // Drop anything that isn't a usable player (no name or no mapped position)
    const usable = players.filter((pl) => pl.name && pl.pos.length > 0)

    // Sort by ADP (fallback to ESPN rank), then derive positional ranks from
    // that order so the "vsPRK" column works without FantasyPros data.
    const orderValue = (pl) => pl.averageDraftPosition ?? pl.espnRank ?? Infinity
    usable.sort((a, b) => orderValue(a) - orderValue(b))

    // The ESPN player universe is ~1500+ players; rendering and drag-ranking
    // all of them is sluggish and a draft only needs the draftable pool. Keep
    // players with a real draft signal (ADP, ESPN rank, or non-trivial
    // ownership), capped to a generous depth.
    // A typical draft is ~15 rounds (~180 players); 250 leaves comfortable depth.
    const DRAFT_POOL_LIMIT = 250
    const ranked = usable.filter(
        (pl) => pl.espnRank != null || pl.averageDraftPosition != null || pl.ownership >= 1
    )
    const pool = (ranked.length ? ranked : usable).slice(0, DRAFT_POOL_LIMIT)

    const posCounters = {}
    for (const pl of pool) {
        const ranks = {}
        for (const position of pl.pos) {
            posCounters[position] = (posCounters[position] || 0) + 1
            ranks[position] = posCounters[position]
        }
        pl.fantasyProsPositionalRank = ranks
    }

    return pool
}
