// Fantasy football positions and helpers

export const OFFENSE_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'FLEX']
export const isOffense = (position) => {
    return OFFENSE_POSITIONS.includes(position)
}

export const SPECIAL_POSITIONS = ['K', 'DST']
export const isSpecial = (position) => {
    return SPECIAL_POSITIONS.includes(position)
}

// Which stat groups apply to each position. Used to decide whether a stat
// column is relevant for a given player (else it renders as "—").
export const GROUPS_BY_POSITION = {
    QB:   ['all', 'pass', 'rush'],
    RB:   ['all', 'rush', 'rec'],
    WR:   ['all', 'rec', 'rush'],
    TE:   ['all', 'rec'],
    FLEX: ['all', 'rush', 'rec'],
    K:    ['all', 'kick'],
    DST:  ['all', 'def'],
}

// Does a stat group apply to any of the given positions?
export function groupAppliesToPositions(positions, group) {
    if (group === 'all') return true
    return (positions || []).some(pos => GROUPS_BY_POSITION[pos]?.includes(group))
}

// Starter thresholds per position for a 10-team league (top-N are "startable").
// QB/TE/K/DST ~ 1 per team; RB/WR ~ 2-3 per team plus flex.
export const STARTER_THRESHOLDS = {
    QB: 12,
    RB: 30,
    WR: 36,
    TE: 12,
    K: 12,
    DST: 12,
    FLEX: 40,
}

// Function to adjust thresholds based on league size
export function getAdjustedThreshold(position, teamCount = 10) {
    const baseThreshold = STARTER_THRESHOLDS[position] || 12

    if (teamCount !== 10) {
        const scaleFactor = teamCount / 10
        return Math.round(baseThreshold * scaleFactor)
    }

    return baseThreshold
}
