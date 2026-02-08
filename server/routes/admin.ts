/**
 * Admin routes for data management
 */

import { Hono } from 'jsr:@hono/hono';
import type { Team, Division, Player, PlayerDetails } from '../types.ts';
import { VALID_DATA_SOURCES } from '../constants.ts';
import {
    get_all_teams,
    get_all_divisions,
    get_player_stats,
    get_player_details,
    get_historical_stats,
    get_projections,
    store_teams,
    store_divisions,
    store_player_stats,
    store_historical_stats,
    store_projection,
    store_players,
} from '../services/storage.ts';
import { fetch_teams_and_divisions, fetch_player_stats } from '../services/espn.ts';
import { fetch_projections, build_player_projections, fetch_historical_stats } from '../services/fangraphs.ts';
import { format_player_stats, format_projections, format_position_eligibility } from '../utils/formatters.ts';

const admin_router = new Hono();

/**
 * Build the custom player store from all data sources
 */
function build_player_store(
    teams: Team[],
    player_details: PlayerDetails[],
    stats: Record<number, any>,
    projections: Record<number, any>,
    historical_stats: Record<number, any>
): Player[] {
    const players: Player[] = player_details.map(player => {
        const current_stats = format_player_stats(stats[player.id], player.eligible_slots);
        const historical = historical_stats[player.id] || {};
        const merged_stats = { ...current_stats, ...historical };

        return {
            id: player.id,
            name: player.full_name,
            firstName: player.first_name,
            lastName: player.last_name,
            team_id: player.pro_team_id,
            pos: format_position_eligibility(player.eligible_slots),
            stats: merged_stats,
            projections: format_projections(projections[player.id]),
            headshot: `https://a.espncdn.com/combiner/i?img=/i/headshots/mlb/players/full/${player.id}.png?w=96&h=70&cb=1`,
            ownership: player.ownership || 0,
            averageDraftPosition: player.average_draft_position || null,
            percentChange: player.percent_change || null,
            injuryStatus: player.injury_status || null,
            age: player.age || null,
            birthDate: player.birth_date || null,
        };
    });

    players.sort((a, b) => b.ownership - a.ownership);
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
 * Refresh historical stats from FanGraphs
 */
async function refresh_historical(
    player_details: PlayerDetails[]
): Promise<Record<number, any>> {
    const historical_stats = await fetch_historical_stats(player_details);
    await store_historical_stats(historical_stats);
    console.log('Historical stats refreshed.');

    return historical_stats;
}

/**
 * Refresh projections from FanGraphs
 */
async function refresh_projections(
    player_details: PlayerDetails[]
): Promise<Record<number, any>> {
    const all_projections = await fetch_projections();
    const projections = build_player_projections(all_projections, player_details);

    for (const [player_id, projection] of Object.entries(projections)) {
        await store_projection(parseInt(player_id), projection);
    }

    console.log('Projections refreshed.');
    return projections;
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
    let stats: Record<number, any>;
    let player_details: Record<number, PlayerDetails>;

    if (sources_to_update.includes('stats')) {
        const result = await refresh_stats();
        stats = result.stats;
        player_details = result.player_details;
    } else {
        stats = await get_player_stats();
        player_details = await get_player_details();
    }

    console.log(`Stats found for players: ${Object.keys(stats).length}`);
    console.log(`Player details found: ${Object.keys(player_details).length}`);

    // Refresh or load historical stats
    let historical_stats: Record<number, any>;
    const player_details_array = Object.values(player_details);

    if (sources_to_update.includes('historical')) {
        historical_stats = await refresh_historical(player_details_array);
    } else {
        historical_stats = await get_historical_stats();
    }

    console.log(`Historical stats found for players: ${Object.keys(historical_stats).length}`);

    // Refresh or load projections
    let projections: Record<number, any>;

    if (sources_to_update.includes('projections')) {
        projections = await refresh_projections(player_details_array);
    } else {
        projections = await get_projections();
    }

    console.log(`Projections found: ${Object.keys(projections).length}`);

    // Build and store custom player objects
    const players = build_player_store(
        teams,
        player_details_array,
        stats,
        projections,
        historical_stats
    );

    await store_players(players);

    return c.json(players);
});

export default admin_router;
