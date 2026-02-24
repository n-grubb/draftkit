import {isBatter, isPitcher} from '~/features/positions'
    
// Default columns (original 5 for each type)
export const DEFAULT_BATTING_COLUMNS = [
    { id: 'R', name: 'R' },
    { id: 'HR', name: 'HR' },
    { id: 'RBI', name: 'RBI' },
    { id: 'SB', name: 'SB' },
    { id: 'OBP', name: 'OBP' },
]

export const DEFAULT_PITCHING_COLUMNS = [
    { id: 'K', name: 'K' },
    { id: 'W', name: 'W' },
    { id: 'ERA', name: 'ERA' },
    { id: 'SVHD', name: 'SVHD' },
    { id: 'WHIP', name: 'WHIP' },
]

// All available batting columns
export const ALL_BATTING_COLUMNS = [
    ...DEFAULT_BATTING_COLUMNS,
    { id: 'AB', name: 'AB' },
    { id: 'PA', name: 'PA' },
    { id: 'AVG', name: 'AVG' },
    { id: 'KO', name: 'KO' },
    { id: 'CS', name: 'CS' },
    { id: 'OPS', name: 'OPS' },
    { id: 'SLG', name: 'SLG' },
    { id: 'XBH', name: 'XBH' },
    { id: 'bBB', name: 'BB' },
]

// All available pitching columns
export const ALL_PITCHING_COLUMNS = [
    ...DEFAULT_PITCHING_COLUMNS,
    { id: 'IP', name: 'IP' },
    { id: 'HD', name: 'HD' },
    { id: 'SV', name: 'SV' },
    { id: 'QS', name: 'QS' },
    { id: 'BB', name: 'BB' },
    { id: 'K/9', name: 'K/9' },
    { id: 'K/BB', name: 'K/BB' },
    { id: 'BS', name: 'BS' },
    { id: 'HRA', name: 'HR' },
]

// For backward compatibility
export const BATTING_COLUMNS = DEFAULT_BATTING_COLUMNS
export const PITCHING_COLUMNS = DEFAULT_PITCHING_COLUMNS

// Gets the appropriate columns for the current position filter (table-level, not per-row)
const BATTER_FILTER_POSITIONS = ['C','1B','2B','SS','3B','OF','DH','UTIL','2B/SS','1B/3B'];
const PITCHER_FILTER_POSITIONS = ['SP','RP','P'];

export function statsForFilter(posFilter?, customBattingStats?, customPitchingStats?) {
    const positions = [];
    if (!posFilter || BATTER_FILTER_POSITIONS.includes(posFilter)) positions.push('OF');
    if (!posFilter || PITCHER_FILTER_POSITIONS.includes(posFilter)) positions.push('SP');
    return statsToDisplay(positions, customBattingStats, customPitchingStats);
}

// Gets the appropriate columns for a position 
// Optional parameters for custom stat selection and expanded view
export function statsToDisplay(positions, customBattingStats?, customPitchingStats?, expanded = false) {
    let battingColumns = [];
    let pitchingColumns = [];

    // Determine what type of player this is
    const hasBatter = positions.some(position => isBatter(position));
    const hasPitcher = positions.some(position => isPitcher(position));

    // For batting stats
    if (hasBatter) {
        if (expanded) {
            // In expanded view, show all stats
            battingColumns = ALL_BATTING_COLUMNS;
        } else if (customBattingStats?.length) {
            // Use custom selection if provided
            battingColumns = ALL_BATTING_COLUMNS.filter(col => 
                customBattingStats.includes(col.id)
            );
        } else {
            // Default to original 5 columns
            battingColumns = DEFAULT_BATTING_COLUMNS;
        }
    }

    // For pitching stats
    if (hasPitcher) {
        if (expanded) {
            // In expanded view, show all stats
            pitchingColumns = ALL_PITCHING_COLUMNS;
        } else if (customPitchingStats?.length) {
            // Use custom selection if provided
            pitchingColumns = ALL_PITCHING_COLUMNS.filter(col => 
                customPitchingStats.includes(col.id)
            );
        } else {
            // Default to original 5 columns
            pitchingColumns = DEFAULT_PITCHING_COLUMNS;
        }
    }

    return [...battingColumns, ...pitchingColumns];
}