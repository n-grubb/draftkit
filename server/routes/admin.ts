/**
 * Admin routes for data management (NFL / fantasy football)
 */

import { Hono } from 'jsr:@hono/hono';
import type { Team, Division, Player, PlayerDetails } from '../types.ts';
import { VALID_DATA_SOURCES, CURRENT_SEASON } from '../constants.ts';
import {
    get_all_teams,
    get_all_divisions,
    get_player_stats,
    get_player_details,
    store_teams,
    store_divisions,
    store_player_stats,
    store_players,
    cleanup_stale_players,
} from '../services/storage.ts';
import { fetch_teams_and_divisions, fetch_player_stats } from '../services/espn.ts';
import { fetch_fantasypros_rankings, fetch_fantasypros_adp, match_fantasypros_to_players } from '../services/fantasypros.ts';
import {
    format_player_stats,
    format_position_eligibility,
    primary_position,
    extract_projection,
} from '../utils/formatters.ts';

const admin_router = new Hono();

/**
 * Build a headshot URL for a player. Offense/kickers use ESPN NFL headshots;
 * team defenses fall back to the pro team's logo.
 */
function build_headshot(player: PlayerDetails, position: string, team?: Team): string {
    if (position === 'DST') {
        return team?.logo || '';
    }
    return `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${player.id}.png&w=426&h=320&cb=1`;
}

/**
 * Build the custom player store from all data sources
 */
function build_player_store(
    teams: Team[],
    player_details: PlayerDetails[],
    fantasypros_ranks: Record<number, { rank: number; adp: number | null; positionalRanks: Record<string, number> }>
): Player[] {
    const team_by_id = new Map(teams.map(t => [t.id, t]));

    const players: Player[] = player_details.map(player => {
        const position = primary_position(player.eligible_slots, player.default_position_id);
        const raw_stats = player.raw_stats ?? [];
        const merged_stats = format_player_stats(raw_stats, position);
        const projections = extract_projection(raw_stats, position, CURRENT_SEASON);
        const fp_data = fantasypros_ranks[player.id];
        const team = team_by_id.get(player.pro_team_id);

        return {
            id: player.id,
            name: player.full_name,
            firstName: player.first_name,
            lastName: player.last_name,
            team_id: player.pro_team_id,
            pos: format_position_eligibility(player.eligible_slots, player.default_position_id),
            stats: merged_stats,
            projections,
            headshot: build_headshot(player, position, team),
            ownership: player.ownership || 0,
            averageDraftPosition: fp_data?.adp ?? player.average_draft_position ?? null,
            percentChange: player.percent_change || null,
            injuryStatus: player.injury_status || null,
            age: player.age || null,
            birthDate: player.birth_date || null,
            espnRank: player.espn_rank || null,
            fantasyProsRank: fp_data?.rank || null,
            fantasyProsPositionalRank: fp_data?.positionalRanks ?? null,
        };
    });

    players.sort((a, b) => {
        const adpA = a.averageDraftPosition ?? Infinity;
        const adpB = b.averageDraftPosition ?? Infinity;
        return adpA - adpB;
    });
    return players;
}

/**
 * Refresh teams and divisions data
 */
async function refresh_teams(): Promise<{ teams: Team[]; divisions: Division[] }> {
    const { teams, divisions } = await fetch_teams_and_divisions();
    await store_teams(teams);
    await store_divisions(divisions);
    console.log('Teams & divisions refreshed.');

    return {
        teams: Array.from(teams.values()),
        divisions: Array.from(divisions.values()),
    };
}

/**
 * Refresh player stats from ESPN
 */
async function refresh_stats(): Promise<{
    stats: Record<number, any>;
    player_details: Record<number, PlayerDetails>;
}> {
    const player_data = await fetch_player_stats();
    await store_player_stats(player_data);
    console.log('Player stats and details refreshed.');

    return {
        stats: player_data.stats,
        player_details: player_data.player_details,
    };
}

/**
 * Refresh FantasyPros ECR rankings and ADP data
 */
async function refresh_fantasypros(
    player_details: PlayerDetails[]
): Promise<Record<number, { rank: number; adp: number | null; positionalRanks: Record<string, number> }>> {
    try {
        const [fp_players, adp_data] = await Promise.all([
            fetch_fantasypros_rankings(),
            fetch_fantasypros_adp().catch(err => {
                console.warn('Failed to fetch FantasyPros ADP, falling back to ECR page ADP:', err);
                return undefined;
            }),
        ]);
        const matched = match_fantasypros_to_players(fp_players, player_details, adp_data);
        console.log(`FantasyPros: fetched ${fp_players.length} rankings, matched ${Object.keys(matched).length} players, ADP entries: ${adp_data?.size ?? 0}.`);
        return matched;
    } catch (error) {
        console.error('Failed to fetch FantasyPros data:', error);
        return {};
    }
}

/**
 * GET /admin/refresh
 * Manually trigger a data refresh
 */
admin_router.get('/refresh', async (c) => {
    const sources_to_update = [...VALID_DATA_SOURCES];

    if (sources_to_update.length < 1) {
        return c.text('No sources were updated.');
    }

    // Refresh or load teams
    let teams: Team[];
    let divisions: Division[];

    if (sources_to_update.includes('teams')) {
        const result = await refresh_teams();
        teams = result.teams;
        divisions = result.divisions;
    } else {
        teams = await get_all_teams();
        divisions = await get_all_divisions();
    }

    console.log(`Teams found: ${teams.length}`);
    console.log(`Divisions found: ${divisions.length}`);

    // Refresh or load player stats
    let player_details: Record<number, PlayerDetails>;

    if (sources_to_update.includes('stats')) {
        const result = await refresh_stats();
        player_details = result.player_details;
    } else {
        await get_player_stats();
        player_details = await get_player_details();
    }

    console.log(`Player details found: ${Object.keys(player_details).length}`);

    // Refresh FantasyPros rankings
    let fantasypros_ranks: Record<number, { rank: number; adp: number | null; positionalRanks: Record<string, number> }> = {};
    const player_details_array = Object.values(player_details);

    if (sources_to_update.includes('fantasypros')) {
        fantasypros_ranks = await refresh_fantasypros(player_details_array);
    }

    console.log(`FantasyPros ranks matched: ${Object.keys(fantasypros_ranks).length}`);

    // Build and store custom player objects
    const players = build_player_store(
        teams,
        player_details_array,
        fantasypros_ranks
    );

    await store_players(players);

    // Remove KV entries for players no longer in the ESPN response
    const current_player_ids = new Set(players.map(p => p.id));
    const deleted = await cleanup_stale_players(current_player_ids);
    console.log(`Cleaned up ${deleted} stale player/stats entries.`);

    return c.json(players);
});

export default admin_router;
