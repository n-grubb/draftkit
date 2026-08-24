/**
 * Formatting utilities for player data (NFL / fantasy football)
 */

import {
    POSITION_MAP,
    IGNORED_POSITIONS,
    DEFAULT_POSITION_MAP,
    ESPN_STAT_MAP,
    PPR_SCORING,
    SLOT_IDS,
} from '../constants.ts';

/**
 * Convert eligible slot IDs to position abbreviation strings (QB/RB/WR/TE/K/DST).
 * Falls back to the player's default position if no eligible slots map cleanly.
 */
export function format_position_eligibility(
    eligible_slots: number[],
    default_position_id?: number
): string[] {
    const positions = (eligible_slots || [])
        .filter(slot => !IGNORED_POSITIONS.includes(slot))
        .map(slot => POSITION_MAP[slot])
        .filter(Boolean);

    // De-duplicate while preserving order
    const unique = [...new Set(positions)];

    if (unique.length === 0 && default_position_id != null) {
        const fallback = DEFAULT_POSITION_MAP[default_position_id];
        if (fallback) return [fallback];
    }

    return unique;
}

/**
 * Determine a player's primary (scoring) position.
 */
export function primary_position(
    eligible_slots: number[],
    default_position_id?: number
): string {
    if (default_position_id != null && DEFAULT_POSITION_MAP[default_position_id]) {
        return DEFAULT_POSITION_MAP[default_position_id];
    }
    const positions = format_position_eligibility(eligible_slots, default_position_id);
    return positions[0] || 'FLEX';
}

/**
 * Compute a normalized stat line (our stat keys) from a raw ESPN stats map,
 * including PPR fantasy points.
 *
 * For kickers and defenses, ESPN's appliedTotal is used for fantasy points
 * because their scoring (FG distance tiers, points-allowed tiers) is not
 * captured by the simple PPR weights. For offense we compute PPR points
 * directly so the result is independent of whichever league scoring the ESPN
 * request happened to use.
 */
function compute_stat_line(
    raw_stats: Record<number, number>,
    position: string,
    applied_total?: number
): Record<string, number> {
    const line: Record<string, number> = {};

    for (const [key, id] of Object.entries(ESPN_STAT_MAP)) {
        const value = raw_stats[id];
        if (value != null) {
            line[key] = value;
        }
    }

    let fpts = 0;
    for (const [key, weight] of Object.entries(PPR_SCORING)) {
        if (line[key] != null) {
            fpts += line[key] * weight;
        }
    }

    if ((position === 'DST' || position === 'K') && typeof applied_total === 'number') {
        fpts = applied_total;
    }

    line.FPTS = Math.round(fpts * 10) / 10;
    return line;
}

/**
 * Extract full-season actual stats per year from an ESPN player's stats array.
 * ESPN encodes each split via statSourceId (0 = actual, 1 = projected) and
 * statSplitTypeId (0 = full season).
 */
export function format_player_stats(
    stat_entries: any[],
    position: string
): Record<number, Record<string, number>> {
    const player_stats: Record<number, Record<string, number>> = {};

    if (!Array.isArray(stat_entries)) {
        return player_stats;
    }

    for (const entry of stat_entries) {
        if (entry?.statSplitTypeId !== 0) continue; // full-season only
        if (entry?.statSourceId !== 0) continue;     // actuals only
        if (!entry.seasonId || !entry.stats) continue;
        player_stats[entry.seasonId] = compute_stat_line(entry.stats, position, entry.appliedTotal);
    }

    return player_stats;
}

/**
 * Extract the projected stat line for a given season from an ESPN player's
 * stats array (statSourceId === 1).
 */
export function extract_projection(
    stat_entries: any[],
    position: string,
    season: number
): Record<string, number> {
    if (!Array.isArray(stat_entries)) {
        return {};
    }

    const projection = stat_entries.find(
        (e: any) => e?.statSourceId === 1 && e?.statSplitTypeId === 0 && e?.seasonId === season
    );

    if (!projection?.stats) {
        return {};
    }

    return compute_stat_line(projection.stats, position, projection.appliedTotal);
}

/**
 * Replace accented characters with ASCII equivalents for name matching
 */
export function replace_accented_characters(name: string): string {
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Calculate age from birthdate string (kept for API compatibility; NFL data
 * rarely includes a birth date).
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

// Re-exported so other modules keep a single import site for slot constants.
export { SLOT_IDS };
