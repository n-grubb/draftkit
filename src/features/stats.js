// Format stat values based on the column type
export function formatStatValue(column, value) {
    // Exit early if no value
    if (!value) {
        return 0
    }
    
    // Three decimal columns (batting percentages)
    const THREE_DECIMAL_COLUMNS = ['OBP', 'AVG']
    
    // Two decimal columns (ERA, WHIP, and rate stats)
    const TWO_DECIMAL_COLUMNS = ['ERA', 'WHIP', 'K/9', 'K/BB', 'SLG', 'OPS']
    
    // One decimal column (IP often has partial innings)
    const ONE_DECIMAL_COLUMNS = ['IP']

    if (THREE_DECIMAL_COLUMNS.includes(column)) {
        return value.toFixed(3).substring(1);
    }

    if (TWO_DECIMAL_COLUMNS.includes(column)) {
        return value.toFixed(2);
    }
    
    if (ONE_DECIMAL_COLUMNS.includes(column)) {
        return value.toFixed(1);
    }

    // All other stats should be integers (K, R, HR, etc.)
    return Math.round(value)
}

// Reference values for stat benchmarks (more reasonable values)
const STAT_BENCHMARKS = {
    // Batting stats - max values for normalization
    'R':    80,
    'HR':   30,
    'RBI':  90,
    'SB':   20,
    'OBP':  .370,
    'AB':   550,
    'PA':   600,
    'AVG':  .300,
    'KO':   150,  // Lower is better
    'CS':   8,    // Lower is better
    'OPS':  .850,
    'SLG':  .480,
    'XBH':  60,
    'bBB':  70,
    
    // Pitching stats
    'K':    180,
    'W':    15,
    'ERA':  [5.00, 2.70], // [min, max] - reversed
    'SVHD': 30,
    'WHIP': [1.40, 0.95], // [min, max] - reversed
    'IP':   180,
    'HD':   20,
    'SV':   25,
    'QS':   18,
    'BB':   [80, 30],     // [min, max] - reversed
    'K/9':  9.5,
    'K/BB': 4.0,
    'BS':   [10, 3],      // [min, max] - reversed
    'HRA':  [35, 15],     // [min, max] - reversed
}

// Normalize a stat value to 0-100 scale for radar chart
export function normalizeStatValue(statId, value) {
    if (!value || !STAT_BENCHMARKS[statId]) return 0;
    
    // List of stats where lower values are better (using min/max arrays)
    const REVERSED_RANGE_STATS = ['ERA', 'WHIP', 'BB', 'BS', 'HRA'];
    
    // Stats where lower values are better but use simple values
    const REVERSED_SIMPLE_STATS = ['KO', 'CS'];
    
    // Handle stats with min/max ranges where lower is better
    if (REVERSED_RANGE_STATS.includes(statId)) {
        const [min, max] = STAT_BENCHMARKS[statId];
        // If value is lower than max (better), calculate normalized value
        if (value <= max) return 100;
        // If value is higher than min (worse), return 0
        if (value >= min) return 0;
        // Otherwise normalize between min and max
        return Math.round(100 - ((value - max) / (min - max) * 100));
    } 
    // Handle stats where lower is better but with single benchmark value
    else if (REVERSED_SIMPLE_STATS.includes(statId)) {
        const benchmark = STAT_BENCHMARKS[statId];
        // Higher values are worse - invert the scale
        if (value >= benchmark * 2) return 0; // Twice the benchmark or more = 0
        if (value <= 0) return 100; // Zero is perfect
        // Linear scale from 0 to 2x benchmark value
        return Math.round(100 - ((value / benchmark) * 50));
    } 
    // For regular stats where higher is better
    else {
        const maxValue = STAT_BENCHMARKS[statId];
        // Cap at 100% even if player exceeds benchmark
        return Math.min(100, Math.round((value / maxValue) * 100));
    }
}