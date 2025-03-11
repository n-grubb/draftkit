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
    'OBP':  .400, // Increased from .370 to better differentiate elite (>.360) from good (>.335)
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

// Evaluate the quality of a stat (elite, good, average, below-average)
export function evaluateStatQuality(statId, value, playerPosition) {
    if (!value || !STAT_BENCHMARKS[statId]) return 'neutral';
    
    // Skip quality evaluation for counting stats that don't indicate skill directly
    const COUNTING_STATS = ['PA', 'AB', 'IP'];
    if (COUNTING_STATS.includes(statId)) {
        return 'neutral';
    }
    
    // Special handling for OBP with custom thresholds
    if (statId === 'OBP') {
        // Based on specified thresholds:
        // - Elite: ≥ .360
        // - Good: .335 to .360
        // - Average: .315 to .335
        // - Below average: < .315
        if (value >= .360) return 'elite';
        if (value >= .335) return 'good';
        if (value >= .315) return 'average';
        return 'below-average';
    }
    
    // Special handling for pitchers based on role (SP vs RP)
    if (playerPosition && ['K', 'W', 'QS', 'HD', 'SV'].includes(statId)) {
        if (playerPosition === 'RP' && statId === 'K') {
            // For RP strikeouts: adjust thresholds
            if (value >= 80) return 'elite';  // Elite for RP is 80+ strikeouts
            if (value >= 60) return 'good';
            if (value >= 40) return 'average';
            return 'below-average';
        }
        
        if (playerPosition === 'RP' && statId === 'W') {
            // For RP wins: adjust thresholds
            if (value >= 6) return 'elite';  
            if (value >= 4) return 'good';
            if (value >= 2) return 'average';
            return 'below-average';
        }
        
        if (playerPosition === 'SP' && statId === 'HD') {
            return 'neutral'; // Holds aren't relevant for SP
        }
        
        if (playerPosition === 'SP' && statId === 'SV') {
            return 'neutral'; // Saves aren't relevant for SP
        }
        
        if (playerPosition === 'RP' && statId === 'QS') {
            return 'neutral'; // Quality starts aren't relevant for RP
        }
    }
    
    // Default evaluation for all other stats
    const normalizedValue = normalizeStatValue(statId, value);
    
    // Determine if it's a pitching stat
    const PITCHING_STATS = ['ERA', 'WHIP', 'K', 'W', 'SV', 'SVHD', 'QS', 'BB', 'K/9', 'K/BB', 'BS', 'HRA', 'HD', 'IP'];
    const isPitchingStat = PITCHING_STATS.includes(statId);
    
    // Absolute thresholds for specific stats rather than percentile-based
    // This handles the uneven distribution problem better
    if (statId === 'K/9') {
        // Strikeouts per 9 innings - absolute thresholds
        if (value >= 11.5) return 'elite';      // Truly elite K/9
        if (value >= 9.0) return 'good';       // Good strikeout pitcher 
        if (value >= 7.5) return 'average';    // Average K/9
        return 'below-average';                // Below average K/9
    }
    
    if (statId === 'K/BB') {
        // K/BB ratio - absolute thresholds
        if (value >= 5.0) return 'elite';      // Elite command and K ability
        if (value >= 3.5) return 'good';       // Good command
        if (value >= 2.5) return 'average';    // Average command
        return 'below-average';                // Below average command
    }
    
    // Runs - absolute thresholds
    if (statId === 'R') {
        if (value >= 90) return 'elite';       // Elite runs
        if (value >= 75) return 'good';        // Good runs
        if (value >= 50) return 'average';     // Average runs
        return 'below-average';                // Below average runs
    }
    
    // RBIs - absolute thresholds
    if (statId === 'RBI') {
        if (value >= 90) return 'elite';       // Elite RBIs
        if (value >= 75) return 'good';        // Good RBIs
        if (value >= 50) return 'average';     // Average RBIs
        return 'below-average';                // Below average RBIs
    }
    
    // ERA - absolute thresholds with SP/RP distinction
    if (statId === 'ERA') {
        // Different thresholds for SP vs RP
        if (playerPosition === 'SP') {
            // SP ERA thresholds
            if (value <= 3.00) return 'elite';   // Elite SP ERA
            if (value <= 3.60) return 'good';    // Good SP ERA
            if (value <= 4.20) return 'average'; // Average SP ERA
            return 'below-average';              // Below average SP ERA
        } else if (playerPosition === 'RP') {
            // RP ERA thresholds
            if (value <= 2.75) return 'elite';   // Elite RP ERA
            if (value <= 3.25) return 'good';    // Good RP ERA
            if (value <= 3.75) return 'average'; // Average RP ERA
            return 'below-average';              // Below average RP ERA
        } else {
            // Default ERA thresholds
            if (value <= 3.00) return 'elite';
            if (value <= 3.60) return 'good';
            if (value <= 4.20) return 'average';
            return 'below-average';
        }
    }
    
    // WHIP - absolute thresholds per user requirements
    if (statId === 'WHIP') {
        if (value <= 1.05) return 'elite';     // Elite WHIP
        if (value <= 1.15) return 'good';      // Good WHIP
        if (value <= 1.25) return 'average';   // Average WHIP
        return 'below-average';                // Below average WHIP
    }
    // Different thresholds based on pitching vs hitting stats
    else if (isPitchingStat) {
        // Pitching stats: top 10% for elite, 40% for average
        if (normalizedValue >= 90) return 'elite';
        if (normalizedValue >= 70) return 'good';
        if (normalizedValue >= 40) return 'average';
        return 'below-average';
    } else {
        // Hitting stats: top 5% for elite
        if (normalizedValue >= 95) return 'elite'; 
        if (normalizedValue >= 75) return 'good';
        if (normalizedValue >= 50) return 'average';
        return 'below-average';
    }
}