const BATTING_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'OF', '1B/3B', '2B/SS', 'UTIL', 'DH']
export const isBatter = (position) => {
    return BATTING_POSITIONS.includes(position)
}

const PITCHING_POSITIONS = ['P', 'SP', 'RP']
export const isPitcher = (position) => {
    return PITCHING_POSITIONS.includes(position)
}

// Define starter thresholds for each position
export const STARTER_THRESHOLDS = {
    // Infield positions - top 10 players in a 10-team league
    'C': 10,
    '1B': 10,
    '2B': 10,
    '3B': 10,
    'SS': 10,
    // Outfield - top 40 players in a 10-team league (4 OF spots per team)
    'OF': 40,
    // Combo positions - top 30 players
    '1B/3B': 30,
    '2B/SS': 30, 
    'UTIL': 30,
    // Pitchers - top 60 starters (6 SP per team in 10-team league)
    'SP': 60,
    // Relievers - top 30 closers/setup men (3 RP per team in 10-team league)
    'RP': 30,
    // Generic pitcher position
    'P': 90, // Combined SP+RP
    'DH': 10
};

// Function to adjust thresholds based on league size
export function getAdjustedThreshold(position, teamCount = 10) {
    const baseThreshold = STARTER_THRESHOLDS[position] || 10;
    
    // Scale threshold based on league size
    if (teamCount !== 10) {
        const scaleFactor = teamCount / 10;
        return Math.round(baseThreshold * scaleFactor);
    }
    
    return baseThreshold;
}
