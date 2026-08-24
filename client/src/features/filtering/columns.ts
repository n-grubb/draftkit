import { groupAppliesToPositions } from '~/features/positions'

// Full stat catalog. `group` decides which positions a column is relevant for
// (see GROUPS_BY_POSITION in features/positions).
export const FPTS_COLUMN = { id: 'FPTS', name: 'FPTS', group: 'all' }

export const PASSING_COLUMNS = [
    { id: 'CMP', name: 'CMP', group: 'pass' },
    { id: 'PATT', name: 'ATT', group: 'pass' },
    { id: 'PYDS', name: 'PYDS', group: 'pass' },
    { id: 'PTD', name: 'PTD', group: 'pass' },
    { id: 'INT', name: 'INT', group: 'pass' },
]

export const RUSHING_COLUMNS = [
    { id: 'CAR', name: 'CAR', group: 'rush' },
    { id: 'RYDS', name: 'RYDS', group: 'rush' },
    { id: 'RTD', name: 'RTD', group: 'rush' },
]

export const RECEIVING_COLUMNS = [
    { id: 'TGT', name: 'TGT', group: 'rec' },
    { id: 'REC', name: 'REC', group: 'rec' },
    { id: 'RECYDS', name: 'RECYDS', group: 'rec' },
    { id: 'RECTD', name: 'RECTD', group: 'rec' },
]

export const MISC_OFFENSE_COLUMNS = [
    { id: 'FUML', name: 'FUML', group: 'rush' },
]

export const KICKING_COLUMNS = [
    { id: 'FGM', name: 'FGM', group: 'kick' },
    { id: 'FGA', name: 'FGA', group: 'kick' },
    { id: 'XPM', name: 'XPM', group: 'kick' },
]

export const DEFENSE_COLUMNS = [
    { id: 'SACK', name: 'SACK', group: 'def' },
    { id: 'DINT', name: 'INT', group: 'def' },
    { id: 'FR', name: 'FR', group: 'def' },
    { id: 'DTD', name: 'TD', group: 'def' },
    { id: 'SFTY', name: 'SFTY', group: 'def' },
    { id: 'PA', name: 'PA', group: 'def' },
    { id: 'YDA', name: 'YDA', group: 'def' },
]

// Everything the customizable "Offense" stat set can contain
export const ALL_OFFENSE_COLUMNS = [
    ...PASSING_COLUMNS,
    ...RUSHING_COLUMNS,
    ...RECEIVING_COLUMNS,
    ...MISC_OFFENSE_COLUMNS,
]

// Full catalog (used by the stats legend)
export const ALL_STAT_COLUMNS = [
    FPTS_COLUMN,
    ...ALL_OFFENSE_COLUMNS,
    ...KICKING_COLUMNS,
    ...DEFENSE_COLUMNS,
]

export const COLUMN_BY_ID = Object.fromEntries(ALL_STAT_COLUMNS.map(c => [c.id, c]))

// Default customizable offense stats shown in the "All" view
export const DEFAULT_OFFENSE_STAT_IDS = ['PYDS', 'PTD', 'RYDS', 'RTD', 'REC', 'RECYDS', 'RECTD']

// Curated column sets shown when a single position is selected
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

// Does a stat column apply to a player (based on their positions)?
export function columnAppliesToPlayer(positions, columnId) {
    const col = COLUMN_BY_ID[columnId]
    if (!col) return true
    return groupAppliesToPositions(positions, col.group)
}

// Columns for the table given the active position filter.
// `customStats` (array of stat ids) customizes the default "All" offense view.
export function statsForFilter(posFilter, customStats = null) {
    if (posFilter && CURATED_BY_POSITION[posFilter]) {
        return idsToColumns(CURATED_BY_POSITION[posFilter])
    }

    const offenseIds = (customStats && customStats.length) ? customStats : DEFAULT_OFFENSE_STAT_IDS
    const ids = ['FPTS', ...offenseIds.filter(id => id !== 'FPTS')]
    return idsToColumns([...new Set(ids)])
}

// Columns for a specific player (player card, draft aggregation).
export function statsToDisplay(positions, customStats = null, expanded = false) {
    const primary = (positions || []).find(p => CURATED_BY_POSITION[p]) || 'FLEX'

    if (expanded) {
        // All catalog columns that apply to this player's positions
        return ALL_STAT_COLUMNS.filter(col => groupAppliesToPositions(positions, col.group))
    }

    if (CURATED_BY_POSITION[primary]) {
        return idsToColumns(CURATED_BY_POSITION[primary])
    }

    const offenseIds = (customStats && customStats.length) ? customStats : DEFAULT_OFFENSE_STAT_IDS
    const ids = ['FPTS', ...offenseIds.filter(id => id !== 'FPTS')]
    return idsToColumns([...new Set(ids)])
}
