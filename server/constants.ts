/**
 * Centralized constants for the DraftKit server (NFL / fantasy football)
 *
 * NOTE ON ESPN IDS:
 * The ESPN fantasy football API is not officially documented. The slot IDs,
 * position IDs and stat IDs below are the community-known mappings. If a stat
 * looks wrong after a live refresh, this is the first place to check — every
 * mapping the app relies on is centralized here.
 */

// ESPN lineup slot IDs (football)
export const SLOT_IDS = {
    QB: 0,
    TQB: 1,
    RB: 2,
    RB_WR: 3,
    WR: 4,
    WR_TE: 5,
    TE: 6,
    OP: 7,        // offensive player (superflex)
    DT: 8,
    DE: 9,
    LB: 10,
    DL: 11,
    CB: 12,
    S: 13,
    DB: 14,
    DP: 15,
    DST: 16,      // team defense / special teams
    K: 17,
    P: 18,
    HC: 19,
    BENCH: 20,
    IR: 21,
    FLEX: 23,     // RB/WR/TE
} as const;

// Map ESPN slot IDs to position abbreviations
export const POSITION_MAP: Record<number, string> = {
    0: 'QB',
    2: 'RB',
    4: 'WR',
    6: 'TE',
    16: 'DST',
    17: 'K',
    23: 'FLEX',
};

// Slots that we surface as real, filterable positions
export const DISPLAY_SLOTS = [SLOT_IDS.QB, SLOT_IDS.RB, SLOT_IDS.WR, SLOT_IDS.TE, SLOT_IDS.DST, SLOT_IDS.K];

// Positions to exclude from display (roster/utility slots, not real positions)
export const IGNORED_POSITIONS = [
    SLOT_IDS.TQB,
    SLOT_IDS.RB_WR,
    SLOT_IDS.WR_TE,
    SLOT_IDS.OP,
    SLOT_IDS.DT,
    SLOT_IDS.DE,
    SLOT_IDS.LB,
    SLOT_IDS.DL,
    SLOT_IDS.CB,
    SLOT_IDS.S,
    SLOT_IDS.DB,
    SLOT_IDS.DP,
    SLOT_IDS.P,
    SLOT_IDS.HC,
    SLOT_IDS.BENCH,
    SLOT_IDS.IR,
    SLOT_IDS.FLEX,
];

// ESPN default position IDs (player.defaultPositionId) -> abbreviation.
// Used as a fallback / primary-position hint.
export const DEFAULT_POSITION_MAP: Record<number, string> = {
    1: 'QB',
    2: 'RB',
    3: 'WR',
    4: 'TE',
    5: 'K',
    16: 'DST',
};

// ESPN stat ID mapping (football). statId -> our stat key.
// Offensive stats are the reliable ones we compute PPR points from.
export const ESPN_STAT_MAP: Record<string, number> = {
    // Passing
    PATT: 0,   // pass attempts
    CMP: 1,    // completions
    PYDS: 3,   // passing yards
    PTD: 4,    // passing TDs
    INT: 20,   // interceptions thrown
    // Rushing
    CAR: 23,   // rush attempts
    RYDS: 24,  // rushing yards
    RTD: 25,   // rushing TDs
    // Receiving
    REC: 53,   // receptions
    RECYDS: 42, // receiving yards
    RECTD: 43, // receiving TDs
    TGT: 58,   // targets
    // Misc offense
    FUML: 72,  // fumbles lost
    // Kicking
    FGM: 83,   // field goals made
    FGA: 84,   // field goals attempted
    XPM: 86,   // extra points made
    // Defense / special teams
    SACK: 99,
    DINT: 95,  // defensive interceptions
    FR: 96,    // fumbles recovered
    DTD: 93,   // defensive/ST touchdowns
    SFTY: 98,  // safeties
    PA: 120,   // points allowed
    YDA: 127,  // yards allowed
} as const;

// PPR scoring rules (points per unit). Used to compute fantasy points from
// raw stats so the app does not depend on which ESPN league scoring is queried.
export const PPR_SCORING: Record<string, number> = {
    PYDS: 0.04,   // 1 pt / 25 passing yards
    PTD: 4,
    INT: -2,
    RYDS: 0.1,    // 1 pt / 10 rushing yards
    RTD: 6,
    REC: 1,       // full PPR
    RECYDS: 0.1,  // 1 pt / 10 receiving yards
    RECTD: 6,
    FUML: -2,
    FGM: 3,       // simplified (ESPN varies by distance)
    XPM: 1,
    SACK: 1,
    DINT: 2,
    FR: 2,
    DTD: 6,
    SFTY: 2,
};

// Stats we surface for skill/offense players
export const OFFENSE_STATS = [
    'FPTS', 'PATT', 'CMP', 'PYDS', 'PTD', 'INT',
    'CAR', 'RYDS', 'RTD',
    'TGT', 'REC', 'RECYDS', 'RECTD', 'FUML',
];

// Stats we surface for kickers
export const KICKER_STATS = ['FPTS', 'FGM', 'FGA', 'XPM'];

// Stats we surface for team defenses
export const DEFENSE_STATS = ['FPTS', 'SACK', 'DINT', 'FR', 'DTD', 'SFTY', 'PA', 'YDA'];

// Data sources available for refresh
export const VALID_DATA_SOURCES = ['teams', 'stats', 'fantasypros'] as const;

// API URLs
export const ESPN_TEAMS_URL = 'https://site.web.api.espn.com/apis/site/v2/teams?region=us&lang=en&leagues=nfl';
// Public read endpoint for the full NFL player universe (kona_player_info view).
export const ESPN_PLAYERS_URL = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2026/segments/0/leagues/0?view=kona_player_info';

// FantasyPros URLs (PPR)
export const FANTASYPROS_RANKINGS_URL = 'https://www.fantasypros.com/nfl/rankings/ppr-cheatsheets.php';
export const FANTASYPROS_ADP_URL = 'https://www.fantasypros.com/nfl/adp/ppr-overall.php';

// Current season for data fetching
export const CURRENT_SEASON = 2026;
export const HISTORICAL_SEASONS = [2024, 2025];
