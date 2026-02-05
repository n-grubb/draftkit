/**
 * ESPN API data fetching functions
 */

import type { Team, Division, PlayerData, PlayerDetails } from '../types.ts';
import { ESPN_TEAMS_URL, ESPN_PLAYERS_URL } from '../constants.ts';
import { calculate_age } from '../utils/formatters.ts';

/**
 * Fetch teams and divisions from ESPN
 */
export async function fetch_teams_and_divisions(): Promise<{
    teams: Map<string | number, Team>;
    divisions: Map<number, Division>;
}> {
    const response = await fetch(ESPN_TEAMS_URL);

    if (!response.ok) {
        throw new Error('Failed to fetch teams & divisions.');
    }

    const data = await response.json();
    const teams = new Map<string | number, Team>();
    const divisions = new Map<number, Division>();

    // Add a "Free Agent" team
    teams.set('FA', {
        id: 0,
        abbrev: 'FA',
        division_id: null,
        name: 'Free Agent',
        location: null,
        logo: null,
    });

    data.mlb.forEach((division: any, index: number) => {
        divisions.set(index, { id: index, name: division.name });

        division.teams.forEach((team: any) => {
            teams.set(team.id, {
                id: team.id,
                abbrev: team.abbreviation,
                division_id: index,
                name: team.name,
                location: team.location,
                logo: team.logo,
            });
        });
    });

    return { teams, divisions };
}

/**
 * Fetch player stats and details from ESPN
 * Combines batter and pitcher data into a single response
 */
export async function fetch_player_stats(): Promise<PlayerData> {
    // Fetch batters
    const batter_response = await fetch(ESPN_PLAYERS_URL, {
        headers: {
            'x-fantasy-filter': JSON.stringify({
                players: {
                    filterSlotIds: { value: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 19] },
                    filterRanksForScoringPeriodIds: { value: [162] },
                    sortPercOwned: { sortPriority: 1, sortAsc: false },
                    sortDraftRanks: { sortPriority: 100, sortAsc: true, value: 'STANDARD' },
                    limit: 500,
                },
            }),
        },
    });

    if (!batter_response.ok) {
        throw new Error('Failed to fetch batter stats.');
    }

    const batter_data = await batter_response.json();

    // Fetch pitchers
    const pitcher_response = await fetch(ESPN_PLAYERS_URL, {
        headers: {
            'x-fantasy-filter': JSON.stringify({
                players: {
                    filterSlotIds: { value: [13, 14, 15, 17] },
                    filterRanksForScoringPeriodIds: { value: [162] },
                    sortPercOwned: { sortPriority: 1, sortAsc: false },
                    limit: 400,
                },
            }),
        },
    });

    if (!pitcher_response.ok) {
        throw new Error('Failed to fetch pitcher stats.');
    }

    const pitcher_data = await pitcher_response.json();

    // Process all players
    const stats: Record<number, any> = {};
    const player_details: Record<number, PlayerDetails> = {};

    // Process batters
    for (const batter of batter_data.players) {
        stats[batter.id] = batter.player.stats;
        player_details[batter.id] = extract_player_details(batter);
    }

    // Process pitchers
    for (const pitcher of pitcher_data.players) {
        stats[pitcher.id] = pitcher.player.stats;
        if (!player_details[pitcher.id]) {
            player_details[pitcher.id] = extract_player_details(pitcher);
        }
    }

    return { stats, player_details };
}

/**
 * Extract player details from ESPN player object
 */
function extract_player_details(espn_player: any): PlayerDetails {
    const player = espn_player.player;

    return {
        id: espn_player.id,
        full_name: player.fullName,
        first_name: player.firstName,
        last_name: player.lastName,
        injury_status: player.injuryStatus || null,
        default_position_id: player.defaultPositionId,
        eligible_slots: player.eligibleSlots || [],
        pro_team_id: player.proTeamId,
        ownership: player.ownership?.percentOwned || 0,
        average_draft_position: player.ownership?.averageDraftPosition || null,
        percent_change: player.ownership?.percentChange || null,
        birth_date: player.dateOfBirth || null,
        age: calculate_age(player.dateOfBirth),
    };
}
