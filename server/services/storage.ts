/**
 * Deno KV storage operations
 */

import type { Team, Division, Player, Ranking, PlayerDetails, PlayerData } from '../types.ts';

// Initialize KV store
export const kv = await Deno.openKv();

/* ------------------
 * READ OPERATIONS
 * ------------------ */

export async function get_all_teams(): Promise<Team[]> {
    const teams: Team[] = [];
    const entries = kv.list({ prefix: ['teams'] });
    for await (const entry of entries) {
        teams.push(entry.value as Team);
    }
    return teams;
}

export async function get_all_divisions(): Promise<Division[]> {
    const divisions: Division[] = [];
    const entries = kv.list({ prefix: ['divisions'] });
    for await (const entry of entries) {
        divisions.push(entry.value as Division);
    }
    return divisions;
}

export async function get_all_players(): Promise<Player[]> {
    const players: Player[] = [];
    const entries = kv.list({ prefix: ['players'] });
    for await (const entry of entries) {
        players.push(entry.value as Player);
    }
    players.sort((a, b) => b.ownership - a.ownership);
    return players;
}

export async function get_player_stats(): Promise<Record<number, any>> {
    const stats: Record<number, any> = {};
    const entries = kv.list({ prefix: ['stats'] });
    for await (const entry of entries) {
        stats[entry.key[1] as number] = entry.value;
    }
    return stats;
}

export async function get_player_details(): Promise<Record<number, PlayerDetails>> {
    const details: Record<number, PlayerDetails> = {};
    const entries = kv.list({ prefix: ['players'] });
    for await (const entry of entries) {
        details[entry.key[1] as number] = entry.value as PlayerDetails;
    }
    return details;
}

export async function get_historical_stats(): Promise<Record<number, any>> {
    const stats: Record<number, any> = {};
    const entries = kv.list({ prefix: ['historical'] });
    for await (const entry of entries) {
        stats[entry.key[1] as number] = entry.value;
    }
    return stats;
}

export async function get_projections(): Promise<Record<number, any>> {
    const projections: Record<number, any> = {};
    const entries = kv.list({ prefix: ['projections'] });
    for await (const entry of entries) {
        projections[entry.key[1] as number] = entry.value;
    }
    return projections;
}

export async function get_ranking(id: string): Promise<Ranking | null> {
    const entry = await kv.get(['rankings', id]);
    return entry.value as Ranking | null;
}

export async function get_player_versionstamp(player_id: number): Promise<string | null> {
    const entry = await kv.get(['players', player_id]);
    return entry.versionstamp;
}

/* ------------------
 * WRITE OPERATIONS
 * ------------------ */

export async function store_teams(teams: Map<string | number, Team>): Promise<void> {
    for (const [_, team] of teams) {
        await kv.set(['teams', team.id], team);
    }
}

export async function store_divisions(divisions: Map<number, Division>): Promise<void> {
    for (const [_, division] of divisions) {
        await kv.set(['divisions', division.id], division);
    }
}

export async function store_player_stats(player_data: PlayerData): Promise<void> {
    for (const [player_id, stats] of Object.entries(player_data.stats)) {
        await kv.set(['stats', parseInt(player_id)], stats);
    }

    for (const [player_id, details] of Object.entries(player_data.player_details)) {
        await kv.set(['players', parseInt(player_id)], details);
    }
}

export async function store_historical_stats(stats: Record<number, any>): Promise<void> {
    for (const [player_id, player_stats] of Object.entries(stats)) {
        await kv.set(['historical', parseInt(player_id)], player_stats);
    }
}

export async function store_projection(player_id: number, projection: any): Promise<void> {
    if (Object.keys(projection).length < 1) {
        await kv.delete(['projections', player_id]);
    } else {
        await kv.set(['projections', player_id], projection);
    }
}

export async function store_players(players: Player[]): Promise<void> {
    for (const player of players) {
        await kv.set(['players', player.id], player);
    }
}

export async function store_ranking(ranking: Ranking): Promise<void> {
    await kv.set(['rankings', ranking.id], ranking);
}

/* ------------------
 * UTILITY OPERATIONS
 * ------------------ */

export async function ranking_id_exists(id: string): Promise<boolean> {
    const entry = await kv.get(['rankings', id]);
    return entry.value !== null;
}
