// Football (NFL) sport configuration for DraftKit.
// Player data is fetched directly from ESPN in the browser (no backend) and
// rankings are stored locally. See features/sports/footballEspn.js.

import { fetchFootballPlayers, fetchFootballTeams } from './footballEspn'

/* ----------------------------------------------------------------------------
 * Positions
 * ------------------------------------------------------------------------- */

const OFFENSE_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'FLEX']
const FLEX_POSITIONS = ['RB', 'WR', 'TE']

const GROUPS_BY_POSITION = {
    QB:   ['all', 'pass', 'rush'],
    RB:   ['all', 'rush', 'rec'],
    WR:   ['all', 'rec', 'rush'],
    TE:   ['all', 'rec'],
    FLEX: ['all', 'rush', 'rec'],
    K:    ['all', 'kick'],
    DST:  ['all', 'def'],
}

function groupAppliesToPositions(positions, group) {
    if (group === 'all') return true
    return (positions || []).some(pos => GROUPS_BY_POSITION[pos]?.includes(group))
}

const STARTER_THRESHOLDS = { QB: 12, RB: 30, WR: 36, TE: 12, K: 12, DST: 12, FLEX: 40 }

function getAdjustedThreshold(position, teamCount = 10) {
    const baseThreshold = STARTER_THRESHOLDS[position] || 12
    if (teamCount !== 10) return Math.round(baseThreshold * (teamCount / 10))
    return baseThreshold
}

const POSITION_FILTERS = [
    { label: 'All',  value: undefined },
    { label: 'QB',   value: 'QB'   },
    { label: 'RB',   value: 'RB'   },
    { label: 'WR',   value: 'WR'   },
    { label: 'TE',   value: 'TE'   },
    { label: 'FLEX', value: 'FLEX' },
    { label: 'K',    value: 'K'    },
    { label: 'DST',  value: 'DST'  },
]

const SIMPLE_POSITION_FILTERS = ['QB', 'RB', 'WR', 'TE', 'K', 'DST']

const INJURY_LABELS = {
    QUESTIONABLE: 'Q', DOUBTFUL: 'D', OUT: 'O', INJURY_RESERVE: 'IR', IR: 'IR',
    SUSPENSION: 'SUSP', PROBABLE: 'P', DAY_TO_DAY: 'DTD',
}

function matchPlayerToFilter(player, value) {
    if (!value) return true
    if (value === 'FLEX') return player.pos.some(p => FLEX_POSITIONS.includes(p))
    return player.pos.includes(value)
}

function primaryPosition(player) {
    return player.pos[0] || null
}

function displayPositions(player) {
    return player.pos
}

function injuryLabel(status) {
    if (!status || status === 'ACTIVE') return null
    return INJURY_LABELS[status] || status
}

const STARTER_GROUPS = [
    { category: 'Offense', positions: [
        { id: 'QB', label: 'QB' }, { id: 'RB', label: 'RB' },
        { id: 'WR', label: 'WR' }, { id: 'TE', label: 'TE' },
    ] },
    { category: 'Special', positions: [
        { id: 'K', label: 'K' }, { id: 'DST', label: 'DST' },
    ] },
]

/* ----------------------------------------------------------------------------
 * Stats
 * ------------------------------------------------------------------------- */

function formatStatValue(column, value) {
    if (value === null || value === undefined || value === '') return 0
    if (column === 'FPTS') return Math.round(value * 10) / 10
    return Math.round(value)
}

const STAT_BENCHMARKS = {
    FPTS: 360,
    PATT: 600, CMP: 400, PYDS: 4800, PTD: 40, INT: [18, 5],
    CAR: 320, RYDS: 1600, RTD: 15,
    TGT: 170, REC: 110, RECYDS: 1500, RECTD: 13, FUML: [6, 0],
    FGM: 35, FGA: 40, XPM: 50,
    SACK: 55, DINT: 20, FR: 15, DTD: 5, SFTY: 3, PA: [420, 260], YDA: [6500, 4600],
}
const REVERSED_STATS = ['INT', 'FUML', 'PA', 'YDA']

function normalizeStatValue(statId, value) {
    if (!value || !STAT_BENCHMARKS[statId]) return 0
    if (REVERSED_STATS.includes(statId)) {
        const [worst, best] = STAT_BENCHMARKS[statId]
        if (value <= best) return 100
        if (value >= worst) return 0
        return Math.round(100 - ((value - best) / (worst - best) * 100))
    }
    const maxValue = STAT_BENCHMARKS[statId]
    return Math.min(100, Math.round((value / maxValue) * 100))
}

const FPTS_BANDS = {
    QB:   { elite: 340, good: 290, average: 240 },
    RB:   { elite: 260, good: 200, average: 140 },
    WR:   { elite: 260, good: 200, average: 140 },
    TE:   { elite: 180, good: 130, average: 90 },
    K:    { elite: 150, good: 130, average: 110 },
    DST:  { elite: 140, good: 110, average: 85 },
    FLEX: { elite: 260, good: 200, average: 140 },
}

function evaluateStatQuality(statId, value, playerPosition) {
    if (!value) return 'neutral'
    if (statId === 'FPTS') {
        const bands = FPTS_BANDS[playerPosition] || FPTS_BANDS.FLEX
        if (value >= bands.elite) return 'elite'
        if (value >= bands.good) return 'good'
        if (value >= bands.average) return 'average'
        return 'below-average'
    }
    if (!STAT_BENCHMARKS[statId]) return 'neutral'

    const VOLUME_STATS = ['PATT', 'CMP', 'CAR', 'TGT', 'FGA']
    if (VOLUME_STATS.includes(statId)) return 'neutral'

    const normalizedValue = normalizeStatValue(statId, value)
    if (normalizedValue >= 90) return 'elite'
    if (normalizedValue >= 70) return 'good'
    if (normalizedValue >= 45) return 'average'
    return 'below-average'
}

/* ----------------------------------------------------------------------------
 * Columns / stat groups
 * ------------------------------------------------------------------------- */

const FPTS_COLUMN = { id: 'FPTS', name: 'FPTS', group: 'all' }
const PASSING_COLUMNS = [
    { id: 'CMP', name: 'CMP', group: 'pass' }, { id: 'PATT', name: 'ATT', group: 'pass' },
    { id: 'PYDS', name: 'PYDS', group: 'pass' }, { id: 'PTD', name: 'PTD', group: 'pass' },
    { id: 'INT', name: 'INT', group: 'pass' },
]
const RUSHING_COLUMNS = [
    { id: 'CAR', name: 'CAR', group: 'rush' }, { id: 'RYDS', name: 'RYDS', group: 'rush' },
    { id: 'RTD', name: 'RTD', group: 'rush' },
]
const RECEIVING_COLUMNS = [
    { id: 'TGT', name: 'TGT', group: 'rec' }, { id: 'REC', name: 'REC', group: 'rec' },
    { id: 'RECYDS', name: 'RECYDS', group: 'rec' }, { id: 'RECTD', name: 'RECTD', group: 'rec' },
]
const MISC_OFFENSE_COLUMNS = [{ id: 'FUML', name: 'FUML', group: 'rush' }]
const KICKING_COLUMNS = [
    { id: 'FGM', name: 'FGM', group: 'kick' }, { id: 'FGA', name: 'FGA', group: 'kick' },
    { id: 'XPM', name: 'XPM', group: 'kick' },
]
const DEFENSE_COLUMNS = [
    { id: 'SACK', name: 'SACK', group: 'def' }, { id: 'DINT', name: 'INT', group: 'def' },
    { id: 'FR', name: 'FR', group: 'def' }, { id: 'DTD', name: 'TD', group: 'def' },
    { id: 'SFTY', name: 'SFTY', group: 'def' }, { id: 'PA', name: 'PA', group: 'def' },
    { id: 'YDA', name: 'YDA', group: 'def' },
]

const ALL_OFFENSE_COLUMNS = [...PASSING_COLUMNS, ...RUSHING_COLUMNS, ...RECEIVING_COLUMNS, ...MISC_OFFENSE_COLUMNS]
const ALL_STAT_COLUMNS = [FPTS_COLUMN, ...ALL_OFFENSE_COLUMNS, ...KICKING_COLUMNS, ...DEFENSE_COLUMNS]
const COLUMN_BY_ID = Object.fromEntries(ALL_STAT_COLUMNS.map(c => [c.id, c]))

const DEFAULT_OFFENSE_STAT_IDS = ['PYDS', 'PTD', 'RYDS', 'RTD', 'REC', 'RECYDS', 'RECTD']

const CURATED_BY_POSITION = {
    QB:  ['FPTS', 'CMP', 'PATT', 'PYDS', 'PTD', 'INT', 'RYDS', 'RTD'],
    RB:  ['FPTS', 'CAR', 'RYDS', 'RTD', 'TGT', 'REC', 'RECYDS', 'RECTD'],
    WR:  ['FPTS', 'TGT', 'REC', 'RECYDS', 'RECTD', 'RYDS', 'RTD'],
    TE:  ['FPTS', 'TGT', 'REC', 'RECYDS', 'RECTD'],
    K:   ['FPTS', 'FGM', 'FGA', 'XPM'],
    DST: ['FPTS', 'SACK', 'DINT', 'FR', 'DTD', 'PA', 'YDA'],
}

function idsToColumns(ids) {
    return ids.map(id => COLUMN_BY_ID[id]).filter(Boolean)
}

function columnAppliesToPlayer(positions, columnId) {
    const col = COLUMN_BY_ID[columnId]
    if (!col) return true
    return groupAppliesToPositions(positions, col.group)
}

function offenseIdsFrom(selected) {
    const ids = selected?.offense
    return (ids && ids.length) ? ids : DEFAULT_OFFENSE_STAT_IDS
}

function statsForFilter(posFilter, selected = {}) {
    if (posFilter && CURATED_BY_POSITION[posFilter]) return idsToColumns(CURATED_BY_POSITION[posFilter])
    const ids = ['FPTS', ...offenseIdsFrom(selected).filter(id => id !== 'FPTS')]
    return idsToColumns([...new Set(ids)])
}

function statsToDisplay(positions, selected = {}, expanded = false) {
    const primary = (positions || []).find(p => CURATED_BY_POSITION[p]) || 'FLEX'
    if (expanded) return ALL_STAT_COLUMNS.filter(col => groupAppliesToPositions(positions, col.group))
    if (CURATED_BY_POSITION[primary]) return idsToColumns(CURATED_BY_POSITION[primary])
    const ids = ['FPTS', ...offenseIdsFrom(selected).filter(id => id !== 'FPTS')]
    return idsToColumns([...new Set(ids)])
}

const STAT_FULL_NAMES = {
    FPTS: 'Fantasy Points (PPR)',
    CMP: 'Completions', PATT: 'Pass Attempts', PYDS: 'Passing Yards', PTD: 'Passing Touchdowns', INT: 'Interceptions Thrown',
    CAR: 'Rushing Attempts', RYDS: 'Rushing Yards', RTD: 'Rushing Touchdowns',
    TGT: 'Targets', REC: 'Receptions', RECYDS: 'Receiving Yards', RECTD: 'Receiving Touchdowns', FUML: 'Fumbles Lost',
    FGM: 'Field Goals Made', FGA: 'Field Goals Attempted', XPM: 'Extra Points Made',
    SACK: 'Sacks', DINT: 'Defensive Interceptions', FR: 'Fumbles Recovered', DTD: 'Defensive/ST Touchdowns',
    SFTY: 'Safeties', PA: 'Points Allowed', YDA: 'Yards Allowed',
}

/* ----------------------------------------------------------------------------
 * Draft
 * ------------------------------------------------------------------------- */

const LOWER_IS_BETTER = new Set(['INT', 'FUML', 'PA', 'YDA'])

function aggregateTeamStats(players, playerIds) {
    if (!playerIds.length) return null
    const totals = {}
    playerIds.forEach(pid => {
        const player = players[pid]
        if (!player || !player.projections) return
        Object.entries(player.projections).forEach(([stat, value]) => {
            if (typeof value === 'number') totals[stat] = (totals[stat] || 0) + value
        })
    })
    return totals
}

const RADAR_COLUMNS = [
    { id: 'PYDS', name: 'PYDS' }, { id: 'PTD', name: 'PTD' },
    { id: 'RYDS', name: 'RYDS' }, { id: 'RTD', name: 'RTD' },
    { id: 'REC', name: 'REC' }, { id: 'RECYDS', name: 'RECYDS' }, { id: 'RECTD', name: 'RECTD' },
]

const DRAFT = {
    defaultTeams: 10,
    defaultRounds: 16,
    teamsOptions: [8, 10, 12, 14, 16],
    roundsOptions: [13, 14, 15, 16, 17, 18],
    aggregateTeamStats,
    lowerIsBetter: LOWER_IS_BETTER,
    radarSections: [
        { title: 'Offensive Output', columns: RADAR_COLUMNS, color: 'var(--teal)' },
    ],
    totalsColumns: [FPTS_COLUMN, ...RADAR_COLUMNS],
}

/* ----------------------------------------------------------------------------
 * Data source
 * ------------------------------------------------------------------------- */

const DATA = {
    source: 'espn-direct',
    rankingsLocalOnly: true,
    fetchPlayers: fetchFootballPlayers,
    fetchTeams: fetchFootballTeams,
    largeHeadshot: (url) => url,
    teamLogo: (team) => team?.logo ?? null,
}

const football = {
    key: 'football',
    label: 'Football',
    shortLabel: 'NFL',
    loadingText: 'Loading NFL players from ESPN…',
    dataCredit: 'Player data & PPR projections from ESPN · rankings saved locally in your browser',
    data: DATA,
    positions: {
        filters: POSITION_FILTERS,
        simpleFilters: SIMPLE_POSITION_FILTERS,
        matchPlayerToFilter,
        primaryPosition,
        displayPositions,
        injuryLabel,
        starterGroups: STARTER_GROUPS,
        getAdjustedThreshold,
    },
    stats: { formatStatValue, normalizeStatValue, evaluateStatQuality },
    statGroups: [
        {
            key: 'offense',
            label: 'Offense Stats (All view)',
            help: 'Shown in the default table. Position filters (QB, RB, K, DST…) always show their own curated columns.',
            columns: ALL_OFFENSE_COLUMNS,
            defaultIds: DEFAULT_OFFENSE_STAT_IDS,
        },
    ],
    columns: {
        statsForFilter,
        statsToDisplay,
        columnAppliesToPlayer,
        legendGroups: [
            { title: 'Offense', columns: [FPTS_COLUMN, ...ALL_OFFENSE_COLUMNS] },
            { title: 'Kicking', columns: KICKING_COLUMNS },
            { title: 'Defense / ST', columns: DEFENSE_COLUMNS },
        ],
        statFullNames: STAT_FULL_NAMES,
    },
    draft: DRAFT,
}

export default football
