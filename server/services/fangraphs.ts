/**
 * FanGraphs API data fetching functions
 */

import type { PlayerDetails } from '../types.ts';
import { FANGRAPHS_PROJECTIONS_URL, FANGRAPHS_LEADERS_URL, HISTORICAL_SEASONS, SLOT_IDS } from '../constants.ts';
import { replace_accented_characters, format_projections } from '../utils/formatters.ts';

/**
 * Fetch projections from FanGraphs for batters and pitchers
 */
export async function fetch_projections(): Promise<[any[], any[]]> {
    const batter_url = `${FANGRAPHS_PROJECTIONS_URL}?pos=all&stats=bat&type=steamer`;
    const batter_response = await fetch(batter_url);

    if (!batter_response.ok) {
        throw new Error('Failed to fetch batter projections.');
    }

    const batter_projections = await batter_response.json();

    const pitcher_url = `${FANGRAPHS_PROJECTIONS_URL}?pos=all&stats=pit&type=steamer`;
    const pitcher_response = await fetch(pitcher_url);

    if (!pitcher_response.ok) {
        throw new Error('Failed to fetch pitcher projections.');
    }

    const pitcher_projections = await pitcher_response.json();

    return [batter_projections, pitcher_projections];
}

/**
 * Match FanGraphs projections to players and build projection records
 */
export function build_player_projections(
    projections: [any[], any[]],
    player_details: PlayerDetails[]
): Record<number, any> {
    const [batting_projections, pitching_projections] = projections;
    const player_projections: Record<number, any> = {};

    for (const player of player_details) {
        let projection: Record<string, any> = {};
        const normalized_name = replace_accented_characters(player.full_name);

        // Check if this player is a batter (has UTIL slot)
        if (player.eligible_slots?.includes(SLOT_IDS.UTIL)) {
            const batting = batting_projections.find(
                b => replace_accented_characters(b.PlayerName) === normalized_name
            );

            if (batting) {
                projection = {
                    ...batting,
                    bBB: batting['BB'],
                    KO: batting['SO'],
                };
            }
        }

        // Check if this player is a pitcher (has P slot)
        if (player.eligible_slots?.includes(SLOT_IDS.PITCHER)) {
            const pitching = pitching_projections.find(
                p => replace_accented_characters(p.PlayerName) === normalized_name
            );

            if (pitching) {
                projection = {
                    ...projection,
                    ...pitching,
                    R: projection?.R || 0,
                    HR: projection?.HR || 0,
                    HRA: pitching.HR,
                };
            }
        }

        player_projections[player.id] = projection;
    }

    return player_projections;
}

/**
 * Fetch all pages from a FanGraphs leaders API endpoint
 * The API caps results per page, so we paginate until we have everything
 */
async function fetch_all_leaders(base_url: string): Promise<any[]> {
    const PAGE_SIZE = 1000;
    let all_data: any[] = [];
    let page_num = 1;
    let total_count = Infinity;

    while (all_data.length < total_count) {
        const url = `${base_url}&pagenum=${page_num}&pageitems=${PAGE_SIZE}`;

        try {
            const response = await fetch(url);
            if (!response.ok) break;

            const json = await response.json();
            const page_data = json.data || json || [];

            if (!Array.isArray(page_data) || page_data.length === 0) break;

            all_data = all_data.concat(page_data);

            if (json.totalcount !== undefined) {
                total_count = json.totalcount;
            } else if (page_data.length < PAGE_SIZE) {
                break;
            }

            page_num++;
        } catch (error) {
            console.error(`Failed to fetch FanGraphs leaders page ${page_num}:`, error);
            break;
        }
    }

    return all_data;
}

/**
 * Fetch historical stats for players from the FanGraphs leaders API
 * Fetches data for configured historical seasons, matching players by name
 */
export async function fetch_historical_stats(
    player_details: PlayerDetails[]
): Promise<Record<number, Record<number, any>>> {
    const historical_stats: Record<number, Record<number, any>> = {};

    for (const season of HISTORICAL_SEASONS) {
        const bat_url = `${FANGRAPHS_LEADERS_URL}?pos=all&stats=bat&lg=all&qual=0&season=${season}&season1=${season}&month=0&ind=0`;
        const bat_data = await fetch_all_leaders(bat_url);

        const pit_url = `${FANGRAPHS_LEADERS_URL}?pos=all&stats=pit&lg=all&qual=0&season=${season}&season1=${season}&month=0&ind=0`;
        const pit_data = await fetch_all_leaders(pit_url);

        console.log(`FanGraphs ${season}: ${bat_data.length} batters, ${pit_data.length} pitchers`);

        // Match to players by name
        for (const player of player_details) {
            const normalized_name = replace_accented_characters(player.full_name);

            const batting = bat_data.find(
                b => replace_accented_characters(b.PlayerName) === normalized_name
            );

            const pitching = pit_data.find(
                p => replace_accented_characters(p.PlayerName) === normalized_name
            );

            if (batting || pitching) {
                let merged: Record<string, any> = {};

                if (batting) {
                    merged = { ...batting, bBB: batting['BB'], KO: batting['SO'] };
                }

                if (pitching) {
                    merged = {
                        ...merged,
                        ...pitching,
                        R: merged?.R || 0,
                        HR: merged?.HR || 0,
                        HRA: pitching.HR,
                    };
                }

                if (!historical_stats[player.id]) {
                    historical_stats[player.id] = {};
                }

                historical_stats[player.id][season] = format_projections(merged);
            }
        }
    }

    return historical_stats;
}
