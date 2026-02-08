/**
 * Formatting utilities for player data
 */

import {
    POSITION_MAP,
    IGNORED_POSITIONS,
    ESPN_STAT_MAP,
    BATTER_STATS,
    PITCHER_STATS,
    SLOT_IDS,
} from '../constants.ts';

/**
 * Check if eligible slots indicate a batter (has UTIL slot)
 */
export function is_batter(eligible_slots: number[]): boolean {
    return eligible_slots?.includes(SLOT_IDS.UTIL) ?? false;
}

/**
 * Check if eligible slots indicate a pitcher (has P slot)
 */
export function is_pitcher(eligible_slots: number[]): boolean {
    return eligible_slots?.includes(SLOT_IDS.PITCHER) ?? false;
}

/**
 * Convert eligible slot IDs to position abbreviation strings
 */
export function format_position_eligibility(eligible_slots: number[]): string[] {
    if (!eligible_slots) return [];

    return eligible_slots
        .filter(slot => !IGNORED_POSITIONS.includes(slot))
        .map(slot => POSITION_MAP[slot])
        .filter(Boolean);
}

/**
 * Format player stats from ESPN data, extracting stats for multiple years
 */
export function format_player_stats(
    stats: any[],
    eligible_slots: number[]
): Record<number, Record<string, number>> {
    if (!stats || !Array.isArray(stats)) {
        return {};
    }

    const player_stats: Record<number, Record<string, number>> = {};
    const year_pattern = /^00(\d{4})$/;

    // Find all available years in the stats data
    const available_years = stats
        .filter(ps => ps?.id && year_pattern.test(ps.id))
        .map(ps => {
            const match = ps.id.match(year_pattern);
            return match ? parseInt(match[1]) : null;
        })
        .filter((year): year is number => year !== null);

    // Process each year's stats
    for (const year of available_years) {
        const year_stats = stats.find(ps => ps.id === `00${year}`)?.stats;
        if (year_stats) {
            player_stats[year] = get_applicable_stats(year_stats, eligible_slots);
        }
    }

    return player_stats;
}

/**
 * Extract applicable stats based on player type (batter/pitcher)
 */
export function get_applicable_stats(
    stat_year: Record<number, number>,
    eligible_slots: number[]
): Record<string, number> {
    const applicable_stats: Record<string, number> = {};

    if (is_batter(eligible_slots)) {
        for (const stat of BATTER_STATS) {
            applicable_stats[stat] = stat_year[ESPN_STAT_MAP[stat]] || 0;
        }
    }

    if (is_pitcher(eligible_slots)) {
        for (const stat of PITCHER_STATS) {
            applicable_stats[stat] = stat_year[ESPN_STAT_MAP[stat]] || 0;
        }
    }

    return applicable_stats;
}

/**
 * Format projections from FanGraphs to our standard stat names
 */
export function format_projections(
    projection: Record<string, number> | null
): Record<string, number> {
    if (!projection) {
        return {};
    }

    return {
        AB: projection['AB'] || 0,
        PA: projection['PA'] || 0,
        R: projection['R'] || 0,
        HR: projection['HR'] || 0,
        RBI: projection['RBI'] || 0,
        SB: projection['SB'] || 0,
        OBP: projection['OBP'] || 0,
        AVG: projection['AVG'] || 0,
        KO: projection['SO'] || 0,
        CS: projection['CS'] || 0,
        OPS: projection['OPS'] || 0,
        SLG: projection['SLG'] || 0,
        XBH: (projection['2B'] || 0) + (projection['3B'] || 0),
        IP: projection['IP'] || 0,
        K: projection['SO'] || 0,
        W: projection['W'] || 0,
        ERA: projection['ERA'] || 0,
        WHIP: projection['WHIP'] || 0,
        SV: projection['SV'] || 0,
        HD: projection['HLD'] || 0,
        SVHD: (projection['SV'] || 0) + (projection['HLD'] || 0),
        QS: projection['QS'] || 0,
        BB: projection['BB'] || 0,
        'K/9': projection['K/9'] || 0,
        'K/BB': projection['K/BB'] || 0,
        BS: projection['BS'] || 0,
        HRA: projection['HRA'] || 0,
    };
}

/**
 * Replace accented characters with ASCII equivalents for name matching
 */
export function replace_accented_characters(name: string): string {
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Calculate age from birthdate string
 */
export function calculate_age(date_of_birth: string | null): number | null {
    if (!date_of_birth) return null;

    try {
        const birth_date = new Date(date_of_birth);
        const today = new Date();

        let age = today.getFullYear() - birth_date.getFullYear();
        const month_diff = today.getMonth() - birth_date.getMonth();

        if (month_diff < 0 || (month_diff === 0 && today.getDate() < birth_date.getDate())) {
            age--;
        }

        return age;
    } catch {
        return null;
    }
}
