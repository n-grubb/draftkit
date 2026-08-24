// Format stat values based on the column type (fantasy football)
export function formatStatValue(column, value) {
    if (value === null || value === undefined || value === '') {
        return 0
    }

    // Fantasy points shown with one decimal; everything else is a whole number
    if (column === 'FPTS') {
        return Math.round(value * 10) / 10
    }

    return Math.round(value)
}

// Reference "elite season" values used to normalize a stat to 0-100 for the
// radar charts. Reversed stats (lower is better) use a [worst, best] range.
const STAT_BENCHMARKS = {
    // Fantasy points (generic upper bound; quality uses position-aware bands)
    FPTS:   360,
    // Passing
    PATT:   600,
    CMP:    400,
    PYDS:   4800,
    PTD:    40,
    INT:    [18, 5],   // lower is better
    // Rushing
    CAR:    320,
    RYDS:   1600,
    RTD:    15,
    // Receiving
    TGT:    170,
    REC:    110,
    RECYDS: 1500,
    RECTD:  13,
    FUML:   [6, 0],    // lower is better
    // Kicking
    FGM:    35,
    FGA:    40,
    XPM:    50,
    // Defense / special teams
    SACK:   55,
    DINT:   20,
    FR:     15,
    DTD:    5,
    SFTY:   3,
    PA:     [420, 260], // points allowed, lower is better
    YDA:    [6500, 4600], // yards allowed, lower is better
}

const REVERSED_STATS = ['INT', 'FUML', 'PA', 'YDA']

// Normalize a stat value to 0-100 scale for radar chart
export function normalizeStatValue(statId, value) {
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

// Position-aware fantasy-point bands (full-season PPR projections)
const FPTS_BANDS = {
    QB:   { elite: 340, good: 290, average: 240 },
    RB:   { elite: 260, good: 200, average: 140 },
    WR:   { elite: 260, good: 200, average: 140 },
    TE:   { elite: 180, good: 130, average: 90 },
    K:    { elite: 150, good: 130, average: 110 },
    DST:  { elite: 140, good: 110, average: 85 },
    FLEX: { elite: 260, good: 200, average: 140 },
}

// Evaluate the quality of a stat (elite, good, average, below-average)
export function evaluateStatQuality(statId, value, playerPosition) {
    if (!value) return 'neutral'

    // Fantasy points: use position-aware bands when we know the position
    if (statId === 'FPTS') {
        const bands = FPTS_BANDS[playerPosition] || FPTS_BANDS.FLEX
        if (value >= bands.elite) return 'elite'
        if (value >= bands.good) return 'good'
        if (value >= bands.average) return 'average'
        return 'below-average'
    }

    if (!STAT_BENCHMARKS[statId]) return 'neutral'

    // Volume-only stats don't indicate skill directly
    const VOLUME_STATS = ['PATT', 'CMP', 'CAR', 'TGT', 'FGA']
    if (VOLUME_STATS.includes(statId)) {
        return 'neutral'
    }

    const normalizedValue = normalizeStatValue(statId, value)

    if (normalizedValue >= 90) return 'elite'
    if (normalizedValue >= 70) return 'good'
    if (normalizedValue >= 45) return 'average'
    return 'below-average'
}
