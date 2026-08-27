// Baseball (MLB) sport configuration for DraftKit.
// Encapsulates everything sport-specific: positions, stats, columns, filters,
// draft behavior and the data source.

import { API_URL } from '~/data/config'

/* ----------------------------------------------------------------------------
 * Positions
 * ------------------------------------------------------------------------- */

const BATTING_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'OF', '1B/3B', '2B/SS', 'UTIL', 'DH']
const isBatter = (position) => BATTING_POSITIONS.includes(position)

const PITCHING_POSITIONS = ['P', 'SP', 'RP']
const isPitcher = (position) => PITCHING_POSITIONS.includes(position)

const STARTER_THRESHOLDS = {
    C: 10, '1B': 10, '2B': 10, '3B': 10, SS: 10,
    OF: 40, '1B/3B': 30, '2B/SS': 30, UTIL: 30,
    SP: 60, RP: 30, P: 90, DH: 10,
}

function getAdjustedThreshold(position, teamCount = 10) {
    const baseThreshold = STARTER_THRESHOLDS[position] || 10
    if (teamCount !== 10) {
        return Math.round(baseThreshold * (teamCount / 10))
    }
    return baseThreshold
}

const POSITION_FILTERS = [
    { label: 'All',      value: undefined },
    { label: 'C',        value: 'C'       },
    { label: '1B',       value: '1B'      },
    { label: '2B',       value: '2B'      },
    { label: 'SS',       value: 'SS'      },
    { label: '2B/SS',    value: '2B/SS'   },
    { label: '3B',       value: '3B'      },
    { label: '1B/3B',    value: '1B/3B'   },
    { label: 'OF',       value: 'OF'      },
    { label: 'DH',       value: 'DH'      },
    { label: 'Batters',  value: 'UTIL'    },
    { label: 'SP',       value: 'SP'      },
    { label: 'RP',       value: 'RP'      },
    { label: 'Pitchers', value: 'P'       },
]

const SIMPLE_POSITION_FILTERS = ['C', '1B', '2B', 'SS', '3B', 'OF', 'DH', 'SP', 'RP']

const EXCLUDED_DISPLAY_POSITIONS = ['1B/3B', '2B/SS', 'P', 'UTIL']

const INJURY_LABELS = {
    DAY_TO_DAY: 'DTD', OUT: 'O', SEVEN_DAY_DL: 'IL7', TEN_DAY_DL: 'IL10',
    FIFTEEN_DAY_DL: 'IL15', SIXTY_DAY_DL: 'IL60', SUSPENSION: 'SUSP',
    PATERNITY: 'PAT', BEREAVEMENT: 'BRV',
}

function matchPlayerToFilter(player, value) {
    if (!value) return true
    if (value === 'DH') return player.pos.every(p => p === 'DH' || p === 'UTIL')
    return player.pos.includes(value)
}

function primaryPosition(player) {
    if (player.pos.includes('SP')) return 'SP'
    if (player.pos.includes('RP')) return 'RP'
    return null
}

function displayPositions(player) {
    let positions = player.pos.filter(p => !EXCLUDED_DISPLAY_POSITIONS.includes(p))
    if (positions.length > 1 && !positions.includes('SP')) {
        positions = positions.filter(p => p !== 'DH')
    }
    return positions
}

function injuryLabel(status) {
    if (!status || status === 'ACTIVE') return null
    return INJURY_LABELS[status] || status
}

const STARTER_GROUPS = [
    {
        category: 'Batters',
        positions: [
            { id: 'C', label: 'C' }, { id: '1B', label: '1B' }, { id: '2B', label: '2B' },
            { id: '3B', label: '3B' }, { id: 'SS', label: 'SS' }, { id: 'OF', label: 'OF' },
            { id: '1B/3B', label: 'CI' }, { id: '2B/SS', label: 'MI' },
        ],
    },
    {
        category: 'Pitchers',
        positions: [{ id: 'SP', label: 'SP' }, { id: 'RP', label: 'RP' }],
    },
]

/* ----------------------------------------------------------------------------
 * Stats: formatting, normalization, quality
 * ------------------------------------------------------------------------- */

function formatStatValue(column, value) {
    if (!value) return 0

    const THREE_DECIMAL_COLUMNS = ['OBP', 'AVG']
    const TWO_DECIMAL_COLUMNS = ['ERA', 'WHIP', 'K/9', 'K/BB', 'SLG', 'OPS']
    const ONE_DECIMAL_COLUMNS = ['IP']

    if (THREE_DECIMAL_COLUMNS.includes(column)) return value.toFixed(3).substring(1)
    if (TWO_DECIMAL_COLUMNS.includes(column)) return value.toFixed(2)
    if (ONE_DECIMAL_COLUMNS.includes(column)) return value.toFixed(1)
    return Math.round(value)
}

const STAT_BENCHMARKS = {
    R: 95, HR: 35, RBI: 95, SB: 32, OBP: 0.400, AB: 550, PA: 600, AVG: 0.300,
    KO: 150, CS: 8, OPS: 0.850, SLG: 0.480, XBH: 60, bBB: 70,
    K: 180, W: 14, ERA: [5.00, 2.70], SVHD: 30, WHIP: [1.40, 0.95], IP: 180,
    HD: 20, SV: 25, QS: 18, BB: [80, 30], 'K/9': 9.5, 'K/BB': 4.0,
    BS: [10, 3], HRA: [35, 15],
}

function normalizeStatValue(statId, value) {
    if (!value || !STAT_BENCHMARKS[statId]) return 0

    const REVERSED_RANGE_STATS = ['ERA', 'WHIP', 'BB', 'BS', 'HRA']
    const REVERSED_SIMPLE_STATS = ['KO', 'CS']

    if (REVERSED_RANGE_STATS.includes(statId)) {
        const [min, max] = STAT_BENCHMARKS[statId]
        if (value <= max) return 100
        if (value >= min) return 0
        return Math.round(100 - ((value - max) / (min - max) * 100))
    } else if (REVERSED_SIMPLE_STATS.includes(statId)) {
        const benchmark = STAT_BENCHMARKS[statId]
        if (value >= benchmark * 2) return 0
        if (value <= 0) return 100
        return Math.round(100 - ((value / benchmark) * 50))
    } else {
        const maxValue = STAT_BENCHMARKS[statId]
        return Math.min(100, Math.round((value / maxValue) * 100))
    }
}

function evaluateStatQuality(statId, value, playerPosition) {
    if (!value || !STAT_BENCHMARKS[statId]) return 'neutral'

    const COUNTING_STATS = ['PA', 'AB', 'IP']
    if (COUNTING_STATS.includes(statId)) return 'neutral'

    if (statId === 'OBP') {
        if (value >= 0.360) return 'elite'
        if (value >= 0.335) return 'good'
        if (value >= 0.315) return 'average'
        return 'below-average'
    }

    if (statId === 'SB') {
        if (value >= 30) return 'elite'
        if (value >= 15) return 'good'
        if (value >= 10) return 'average'
        return 'below-average'
    }

    if (playerPosition && ['K', 'W', 'QS', 'HD', 'SV'].includes(statId)) {
        if (playerPosition === 'RP' && statId === 'K') {
            if (value >= 80) return 'elite'
            if (value >= 60) return 'good'
            if (value >= 40) return 'average'
            return 'below-average'
        }
        if (playerPosition === 'RP' && statId === 'W') {
            if (value >= 6) return 'elite'
            if (value >= 4) return 'good'
            if (value >= 2) return 'average'
            return 'below-average'
        }
        if (playerPosition === 'SP' && statId === 'HD') return 'neutral'
        if (playerPosition === 'SP' && statId === 'SV') return 'neutral'
        if (playerPosition === 'RP' && statId === 'QS') return 'neutral'
    }

    const normalizedValue = normalizeStatValue(statId, value)
    const PITCHING_STATS = ['ERA', 'WHIP', 'K', 'W', 'SV', 'SVHD', 'QS', 'BB', 'K/9', 'K/BB', 'BS', 'HRA', 'HD', 'IP']
    const isPitchingStat = PITCHING_STATS.includes(statId)

    if (statId === 'K/9') {
        if (value >= 11.5) return 'elite'
        if (value >= 9.0) return 'good'
        if (value >= 7.5) return 'average'
        return 'below-average'
    }
    if (statId === 'K/BB') {
        if (value >= 5.0) return 'elite'
        if (value >= 3.5) return 'good'
        if (value >= 2.5) return 'average'
        return 'below-average'
    }
    if (statId === 'R') {
        if (value >= 90) return 'elite'
        if (value >= 75) return 'good'
        if (value >= 50) return 'average'
        return 'below-average'
    }
    if (statId === 'RBI') {
        if (value >= 90) return 'elite'
        if (value >= 75) return 'good'
        if (value >= 50) return 'average'
        return 'below-average'
    }
    if (statId === 'ERA') {
        if (playerPosition === 'RP') {
            if (value <= 2.75) return 'elite'
            if (value <= 3.25) return 'good'
            if (value <= 3.75) return 'average'
            return 'below-average'
        }
        if (value <= 3.00) return 'elite'
        if (value <= 3.60) return 'good'
        if (value <= 4.20) return 'average'
        return 'below-average'
    }
    if (statId === 'WHIP') {
        if (value <= 1.05) return 'elite'
        if (value <= 1.15) return 'good'
        if (value <= 1.25) return 'average'
        return 'below-average'
    }
    if (statId === 'K' && playerPosition === 'SP') {
        if (value >= 200) return 'elite'
        if (value >= 150) return 'good'
        if (value >= 120) return 'average'
        return 'below-average'
    } else if (isPitchingStat) {
        if (normalizedValue >= 90) return 'elite'
        if (normalizedValue >= 70) return 'good'
        if (normalizedValue >= 40) return 'average'
        return 'below-average'
    } else {
        if (normalizedValue >= 95) return 'elite'
        if (normalizedValue >= 75) return 'good'
        if (normalizedValue >= 50) return 'average'
        return 'below-average'
    }
}

/* ----------------------------------------------------------------------------
 * Columns / stat groups
 * ------------------------------------------------------------------------- */

const DEFAULT_BATTING_COLUMNS = [
    { id: 'R', name: 'R' }, { id: 'HR', name: 'HR' }, { id: 'RBI', name: 'RBI' },
    { id: 'SB', name: 'SB' }, { id: 'OBP', name: 'OBP' },
]
const DEFAULT_PITCHING_COLUMNS = [
    { id: 'K', name: 'K' }, { id: 'W', name: 'W' }, { id: 'ERA', name: 'ERA' },
    { id: 'SVHD', name: 'SVHD' }, { id: 'WHIP', name: 'WHIP' },
]
const ALL_BATTING_COLUMNS = [
    ...DEFAULT_BATTING_COLUMNS,
    { id: 'AB', name: 'AB' }, { id: 'PA', name: 'PA' }, { id: 'AVG', name: 'AVG' },
    { id: 'KO', name: 'KO' }, { id: 'CS', name: 'CS' }, { id: 'OPS', name: 'OPS' },
    { id: 'SLG', name: 'SLG' }, { id: 'XBH', name: 'XBH' }, { id: 'bBB', name: 'BB' },
]
const ALL_PITCHING_COLUMNS = [
    ...DEFAULT_PITCHING_COLUMNS,
    { id: 'IP', name: 'IP' }, { id: 'HD', name: 'HD' }, { id: 'SV', name: 'SV' },
    { id: 'QS', name: 'QS' }, { id: 'BB', name: 'BB' }, { id: 'K/9', name: 'K/9' },
    { id: 'K/BB', name: 'K/BB' }, { id: 'BS', name: 'BS' }, { id: 'HRA', name: 'HR' },
]

const BATTING_COLUMN_IDS = new Set(ALL_BATTING_COLUMNS.map(c => c.id))
const PITCHING_COLUMN_IDS = new Set(ALL_PITCHING_COLUMNS.map(c => c.id))

const BATTER_FILTER_POSITIONS = ['C', '1B', '2B', 'SS', '3B', 'OF', 'DH', 'UTIL', '2B/SS', '1B/3B']
const PITCHER_FILTER_POSITIONS = ['SP', 'RP', 'P']

const STAT_GROUPS = [
    { key: 'batting', label: 'Batting Stats', columns: ALL_BATTING_COLUMNS, defaultIds: DEFAULT_BATTING_COLUMNS.map(c => c.id) },
    { key: 'pitching', label: 'Pitching Stats', columns: ALL_PITCHING_COLUMNS, defaultIds: DEFAULT_PITCHING_COLUMNS.map(c => c.id) },
]

function pickColumns(all, defaults, selectedIds, expanded) {
    if (expanded) return all
    if (selectedIds && selectedIds.length) return all.filter(c => selectedIds.includes(c.id))
    return defaults
}

function statsToDisplay(positions, selected = {}, expanded = false) {
    const hasBatter = positions.some(p => isBatter(p))
    const hasPitcher = positions.some(p => isPitcher(p))
    let batting = []
    let pitching = []
    if (hasBatter) batting = pickColumns(ALL_BATTING_COLUMNS, DEFAULT_BATTING_COLUMNS, selected.batting, expanded)
    if (hasPitcher) pitching = pickColumns(ALL_PITCHING_COLUMNS, DEFAULT_PITCHING_COLUMNS, selected.pitching, expanded)
    return [...batting, ...pitching]
}

function statsForFilter(posFilter, selected = {}) {
    const positions = []
    if (!posFilter || BATTER_FILTER_POSITIONS.includes(posFilter)) positions.push('OF')
    if (!posFilter || PITCHER_FILTER_POSITIONS.includes(posFilter)) positions.push('SP')
    return statsToDisplay(positions, selected)
}

function columnAppliesToPlayer(positions, columnId) {
    const hasBatting = positions?.some(p => isBatter(p))
    const hasPitching = positions?.some(p => isPitcher(p))
    if (PITCHING_COLUMN_IDS.has(columnId) && !hasPitching) return false
    if (BATTING_COLUMN_IDS.has(columnId) && !hasBatting) return false
    return true
}

const STAT_FULL_NAMES = {
    R: 'Runs', HR: 'Home Runs', RBI: 'Runs Batted In', SB: 'Stolen Bases',
    OBP: 'On-Base Percentage', AB: 'At Bats', PA: 'Plate Appearances', AVG: 'Batting Average',
    KO: 'Strikeouts', CS: 'Caught Stealing', OPS: 'On-base Plus Slugging', SLG: 'Slugging Percentage',
    XBH: 'Extra Base Hits', bBB: 'Walks',
    K: 'Strikeouts', W: 'Wins', ERA: 'Earned Run Average', SVHD: 'Saves + Holds',
    WHIP: 'Walks + Hits per IP', IP: 'Innings Pitched', HD: 'Holds', SV: 'Saves',
    QS: 'Quality Starts', BB: 'Walks', 'K/9': 'Strikeouts per 9 IP', 'K/BB': 'Strikeout to Walk Ratio',
    BS: 'Blown Saves', HRA: 'Home Runs Allowed',
}

/* ----------------------------------------------------------------------------
 * Draft
 * ------------------------------------------------------------------------- */

const LOWER_IS_BETTER = new Set(['ERA', 'WHIP', 'BB', 'BS', 'HRA', 'KO', 'CS'])

function aggregateTeamStats(players, playerIds) {
    if (!playerIds.length) return null

    const totals = {}
    const allStatColumns = new Set()
    playerIds.forEach(pid => {
        const player = players[pid]
        if (!player) return
        statsToDisplay(player.pos).forEach(col => allStatColumns.add(col.id))
    })
    allStatColumns.forEach(stat => { totals[stat] = 0 })

    let batterCount = 0
    playerIds.forEach(pid => {
        const player = players[pid]
        if (!player) return
        if (!(player.pos.includes('SP') || player.pos.includes('RP'))) batterCount++
    })

    playerIds.forEach(pid => {
        const player = players[pid]
        if (!player || !player.projections) return
        const pitcher = player.pos.includes('SP') || player.pos.includes('RP')

        Object.entries(player.projections).forEach(([stat, value]) => {
            if (totals[stat] === undefined || !value) return
            if (stat === 'ERA' || stat === 'WHIP') {
                if (player.projections.IP) {
                    totals[stat] += value * player.projections.IP
                    totals[`${stat}_IP`] = (totals[`${stat}_IP`] || 0) + player.projections.IP
                }
            } else if (['OBP', 'AVG', 'SLG', 'OPS'].includes(stat)) {
                if (!pitcher) totals[stat] += value
            } else if (stat === 'K') {
                if (pitcher) totals[stat] += value
            } else {
                totals[stat] += value
            }
        })
    })

    if (batterCount > 0) {
        ['OBP', 'AVG', 'SLG', 'OPS'].forEach(stat => {
            if (totals[stat] !== undefined) totals[stat] = totals[stat] / batterCount
        })
    }
    if (totals.ERA && totals.ERA_IP) { totals.ERA = totals.ERA / totals.ERA_IP; delete totals.ERA_IP }
    if (totals.WHIP && totals.WHIP_IP) { totals.WHIP = totals.WHIP / totals.WHIP_IP; delete totals.WHIP_IP }

    return totals
}

const DRAFT = {
    defaultTeams: 10,
    defaultRounds: 26,
    teamsOptions: [8, 10, 12, 14, 16],
    roundsOptions: [20, 22, 24, 26, 28, 30],
    aggregateTeamStats,
    lowerIsBetter: LOWER_IS_BETTER,
    radarSections: [
        { title: 'Batting Stats', columns: DEFAULT_BATTING_COLUMNS, color: 'var(--teal)' },
        { title: 'Pitching Stats', columns: DEFAULT_PITCHING_COLUMNS, color: 'var(--maroon)' },
    ],
    totalsColumns: [...DEFAULT_BATTING_COLUMNS, ...DEFAULT_PITCHING_COLUMNS],
}

/* ----------------------------------------------------------------------------
 * Data source
 * ------------------------------------------------------------------------- */

const DATA = {
    source: 'server',
    apiUrl: API_URL,
    rankingsLocalOnly: false,
    playersUrl: `${API_URL}/players`,
    teamsUrl: `${API_URL}/teams`,
    // Baseball headshots come sized w=96/h=70; upscale for display.
    largeHeadshot: (url) => (url ? url.replace('w=96', 'w=426').replace('h=70', 'h=320') : url),
    teamLogo: (team) => team?.logo?.href ?? team?.logo ?? null,
}

const baseball = {
    key: 'baseball',
    label: 'Baseball',
    shortLabel: 'MLB',
    loadingText: 'Loading MLB players and teams...',
    dataCredit: 'Player data from ESPN · 2026 projections from FanGraphs · rankings from FantasyPros',
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
    statGroups: STAT_GROUPS,
    columns: {
        statsForFilter,
        statsToDisplay,
        columnAppliesToPlayer,
        legendGroups: [
            { title: 'Batting Stats', columns: ALL_BATTING_COLUMNS },
            { title: 'Pitching Stats', columns: ALL_PITCHING_COLUMNS },
        ],
        statFullNames: STAT_FULL_NAMES,
    },
    draft: DRAFT,
}

export default baseball
