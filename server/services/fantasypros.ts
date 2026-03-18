/**
 * FantasyPros data fetching functions
 * Fetches ECR (Expert Consensus Rankings) and ADP data
 */

import type { PlayerDetails } from '../types.ts';
import { FANTASYPROS_RANKINGS_URL } from '../constants.ts';
import { replace_accented_characters } from '../utils/formatters.ts';

export interface FantasyProsPlayer {
    rank: number;
    name: string;
    team: string;
    position: string;
    adp: number | null;
}

/**
 * Fetch ECR rankings from FantasyPros
 * Parses the HTML page to extract embedded ranking data
 */
export async function fetch_fantasypros_rankings(): Promise<FantasyProsPlayer[]> {
    const response = await fetch(FANTASYPROS_RANKINGS_URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch FantasyPros rankings: ${response.status}`);
    }

    const html = await response.text();
    return parse_fantasypros_html(html);
}

/**
 * Parse FantasyPros HTML page to extract ranking data
 * Looks for embedded ECR data in script tags first, then falls back to table parsing
 */
function parse_fantasypros_html(html: string): FantasyProsPlayer[] {
    // Try to find embedded ecrData JSON in script tags
    const ecr_match = html.match(/var\s+ecrData\s*=\s*({[\s\S]*?});/);
    if (ecr_match) {
        try {
            const ecr_data = JSON.parse(ecr_match[1]);
            if (ecr_data.players && Array.isArray(ecr_data.players)) {
                return ecr_data.players.map((p: any) => ({
                    rank: p.rank_ecr || p.rank || 0,
                    name: p.player_name || p.name || '',
                    team: p.player_team_id || p.team || '',
                    position: p.player_position_id || p.pos || '',
                    adp: p.adp ? parseFloat(p.adp) : null,
                }));
            }
        } catch {
            console.warn('Failed to parse ecrData JSON, falling back to table parsing');
        }
    }

    // Fallback: parse the HTML table rows
    return parse_ranking_table(html);
}

/**
 * Parse ranking data from an HTML table
 */
function parse_ranking_table(html: string): FantasyProsPlayer[] {
    const players: FantasyProsPlayer[] = [];

    // Match table rows with ranking data
    // FantasyPros tables typically have: Rank, Player Name, Team, Position(s), ADP
    const row_regex = /<tr[^>]*class="[^"]*mpb-player[^"]*"[^>]*>[\s\S]*?<\/tr>/gi;
    const rows = html.match(row_regex) || [];

    for (const row of rows) {
        // Extract cells
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        if (cells.length < 3) continue;

        const strip_html = (s: string) => s.replace(/<[^>]+>/g, '').trim();

        const rank_text = strip_html(cells[0]);
        const rank = parseInt(rank_text);
        if (isNaN(rank)) continue;

        // Player name is usually in the second cell, possibly wrapped in an anchor tag
        const name_match = cells[1].match(/<a[^>]*fp-player-name="([^"]+)"/) ||
                          cells[1].match(/<a[^>]*>([^<]+)<\/a>/);
        const name = name_match ? name_match[1].trim() : strip_html(cells[1]);

        if (!name) continue;

        // Find ADP - usually the last numeric cell
        let adp: number | null = null;
        for (let i = cells.length - 1; i >= 2; i--) {
            const val = parseFloat(strip_html(cells[i]));
            if (!isNaN(val) && val > 0 && val < 1000) {
                adp = val;
                break;
            }
        }

        // Position and team from intermediate cells
        const position = cells.length > 3 ? strip_html(cells[3]) : '';
        const team = cells.length > 2 ? strip_html(cells[2]) : '';

        players.push({ rank, name, team, position, adp });
    }

    return players;
}

/**
 * Normalize FantasyPros position strings to match app position abbreviations
 */
function normalize_position(position: string): string {
    const pos = position.trim().toUpperCase();
    if (pos === 'LF' || pos === 'CF' || pos === 'RF') return 'OF';
    return pos;
}

/**
 * Compute positional ranks from the overall rankings list.
 * Players are already sorted by overall ECR rank, so we assign
 * within-position ranks (1, 2, 3...) in that order.
 * Returns a map of player name (lowercase, accent-normalized) -> { position -> positional rank }
 */
function compute_positional_ranks(
    fp_players: FantasyProsPlayer[]
): Map<string, Record<string, number>> {
    const position_counters: Record<string, number> = {};
    const result = new Map<string, Record<string, number>>();

    for (const player of fp_players) {
        const pos = normalize_position(player.position);
        if (!pos) continue;

        position_counters[pos] = (position_counters[pos] || 0) + 1;
        const name_key = replace_accented_characters(player.name).toLowerCase();
        const existing = result.get(name_key) || {};
        existing[pos] = position_counters[pos];
        result.set(name_key, existing);
    }

    return result;
}

/**
 * Match FantasyPros players to our player details by name
 * Returns a map of ESPN player ID -> { rank, adp, positionalRanks }
 */
export function match_fantasypros_to_players(
    fp_players: FantasyProsPlayer[],
    player_details: PlayerDetails[]
): Record<number, { rank: number; adp: number | null; positionalRanks: Record<string, number> }> {
    const result: Record<number, { rank: number; adp: number | null; positionalRanks: Record<string, number> }> = {};

    const positional_ranks = compute_positional_ranks(fp_players);

    // Build a name lookup for our players
    const name_to_player = new Map<string, PlayerDetails>();
    const lastname_firstname_to_player = new Map<string, PlayerDetails>();

    for (const player of player_details) {
        const normalized = replace_accented_characters(player.full_name).toLowerCase();
        name_to_player.set(normalized, player);

        // Also try "LastName FirstName" format
        const reversed = `${replace_accented_characters(player.last_name)} ${replace_accented_characters(player.first_name)}`.toLowerCase();
        lastname_firstname_to_player.set(reversed, player);
    }

    for (const fp of fp_players) {
        const normalized_name = replace_accented_characters(fp.name).toLowerCase();

        let matched = name_to_player.get(normalized_name);
        if (!matched) {
            matched = lastname_firstname_to_player.get(normalized_name);
        }

        if (matched) {
            result[matched.id] = {
                rank: fp.rank,
                adp: fp.adp,
                positionalRanks: positional_ranks.get(normalized_name) || {},
            };
        }
    }

    return result;
}
