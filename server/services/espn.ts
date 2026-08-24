/**
 * ESPN API data fetching functions (NFL / fantasy football)
 */

import type { Team, Division, PlayerData, PlayerDetails } from '../types.ts';
import {
    ESPN_TEAMS_URL,
    ESPN_PLAYERS_URL,
    SLOT_IDS,
} from '../constants.ts';
import { calculate_age } from '../utils/formatters.ts';

/**
 * Fetch NFL pro teams from ESPN.
 * Football has no fantasy-relevant divisions, but the divisions map is kept
 * for API/storage compatibility with the rest of the app.
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

    // Add a "Free Agent" team (proTeamId 0)
    teams.set(0, {
        id: 0,
        abbrev: 'FA',
        division_id: null,
        name: 'Free Agent',
        location: null,
        logo: null,
        color: null,
    });

    const league_teams = data?.sports?.[0]?.leagues?.[0]?.teams ?? [];

    for (const entry of league_teams) {
        const team = entry.team;
        if (!team) continue;

        teams.set(Number(team.id), {
            id: Number(team.id),
            abbrev: team.abbreviation,
            division_id: null,
            name: team.name ?? team.displayName ?? team.abbreviation,
            location: team.location ?? null,
            logo: team.logos?.[0]?.href ?? null,
            color: team.color ? `#${team.color}` : null,
        });
    }

    return { teams, divisions };
}

/**
 * Fetch player stats and details from ESPN (kona_player_info view).
 * A single request returns the full fantasy-relevant player universe with
 * both projected and prior-season stat splits embedded per player.
 */
export async function fetch_player_stats(): Promise<PlayerData> {
    const response = await fetch(ESPN_PLAYERS_URL, {
        headers: {
            'x-fantasy-filter': JSON.stringify({
                players: {
                    filterSlotIds: {
                        value: [
                            SLOT_IDS.QB,
                            SLOT_IDS.RB,
                            SLOT_IDS.WR,
                            SLOT_IDS.TE,
                            SLOT_IDS.DST,
                            SLOT_IDS.K,
                        ],
                    },
                    sortDraftRanks: { sortPriority: 100, sortAsc: true, value: 'PPR' },
                    sortPercOwned: { sortPriority: 1, sortAsc: false },
                    limit: 1500,
                },
            }),
            'x-fantasy-platform': 'kona',
            'x-fantasy-source': 'kona',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch player stats.');
    }

    const data = await response.json();

    const stats: Record<number, any> = {};
    const player_details: Record<number, PlayerDetails> = {};

    for (const entry of data.players || []) {
        const id = entry.id;
        stats[id] = entry.player?.stats ?? [];
        player_details[id] = extract_player_details(entry);
    }

    return { stats, player_details };
}

/**
 * Extract player details from an ESPN player object
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
        espn_rank:
            player.draftRanksByRankType?.PPR?.rank ??
            player.draftRanksByRankType?.STANDARD?.rank ??
            null,
        raw_stats: player.stats ?? [],
    };
}
