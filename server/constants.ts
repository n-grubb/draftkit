/**
 * Centralized constants for the DraftKit server
 */

// ESPN slot IDs for position eligibility
export const SLOT_IDS = {
    CATCHER: 0,
    FIRST_BASE: 1,
    SECOND_BASE: 2,
    THIRD_BASE: 3,
    SHORTSTOP: 4,
    OUTFIELD: 5,
    SECOND_SHORT: 6,
    FIRST_THIRD: 7,
    LEFT_FIELD: 8,
    CENTER_FIELD: 9,
    RIGHT_FIELD: 10,
    DH: 11,
    UTIL: 12,        // All batters have this
    PITCHER: 13,     // All pitchers have this
    STARTER: 14,
    RELIEVER: 15,
    BENCH: 16,
    IL: 17,
    INVALID: 18,
    INFIELD: 19,
    BATTER: 20,
    PITCHER_ALT: 21,
    MISC: 22,
} as const;

// Map ESPN slot IDs to position abbreviations
export const POSITION_MAP: Record<number, string> = {
    0: 'C',
    1: '1B',
    2: '2B',
    3: '3B',
    4: 'SS',
    5: 'OF',
    6: '2B/SS',
    7: '1B/3B',
    8: 'LF',
    9: 'CF',
    10: 'RF',
    11: 'DH',
    12: 'UTIL',
    13: 'P',
    14: 'SP',
    15: 'RP',
    16: 'BE',
    17: 'IL',
    18: 'INV',
    19: 'IF',
    20: 'B',
    21: 'P',
    22: 'MISC',
};

// Positions to exclude from display (covered by others or not used)
export const IGNORED_POSITIONS = [
    SLOT_IDS.LEFT_FIELD,
    SLOT_IDS.CENTER_FIELD,
    SLOT_IDS.RIGHT_FIELD,
    SLOT_IDS.BENCH,
    SLOT_IDS.IL,
    SLOT_IDS.INVALID,
    SLOT_IDS.INFIELD,
    SLOT_IDS.BATTER,
    SLOT_IDS.PITCHER_ALT,
    SLOT_IDS.MISC,
];

// ESPN stat ID mapping
export const ESPN_STAT_MAP: Record<string, number> = {
    AB: 0,
    PA: 16,
    R: 20,
    HR: 5,
    RBI: 21,
    SB: 23,
    OBP: 17,
    AVG: 2,
    KO: 27,
    CS: 24,
    OPS: 18,
    SLG: 9,
    XBH: 6,
    IP: 34,
    K: 48,
    W: 53,
    ERA: 47,
    WHIP: 41,
    SVHD: 83,
    HD: 59,
    SV: 57,
    QS: 63,
    CG: 62,
    'K/9': 49,
    BB: 39,
    'K/BB': 82,
    'SV%': 59,
    BS: 58,
    IRS: 61,
    HRA: 46,
};

// Batter stats to extract from ESPN data
export const BATTER_STATS = [
    'AB', 'PA', 'R', 'HR', 'RBI', 'SB', 'OBP', 'AVG', 'KO', 'CS', 'OPS', 'SLG', 'XBH'
];

// Pitcher stats to extract from ESPN data
export const PITCHER_STATS = [
    'IP', 'K', 'W', 'ERA', 'WHIP', 'SVHD', 'HD', 'SV', 'QS', 'BB', 'K/9', 'K/BB', 'BS', 'HRA'
];

// Data sources available for refresh
export const VALID_DATA_SOURCES = ['teams', 'stats', 'projections', 'historical'] as const;

// API URLs
export const ESPN_TEAMS_URL = 'https://site.web.api.espn.com/apis/site/v2/teams?region=us&lang=en&leagues=mlb';
export const ESPN_PLAYERS_URL = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/flb/seasons/2026/segments/0/leagues/3850?view=kona_player_info';
export const FANGRAPHS_PROJECTIONS_URL = 'https://www.fangraphs.com/api/projections';
export const FANGRAPHS_LEADERS_URL = 'https://www.fangraphs.com/api/leaders/major-league/data';

// Current season for data fetching
export const CURRENT_SEASON = 2026;
export const HISTORICAL_SEASONS = [2024, 2025];
