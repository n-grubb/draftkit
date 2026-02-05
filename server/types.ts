/**
 * Shared type definitions for the DraftKit server
 */

export interface Team {
    id: number;
    abbrev: string;
    division_id: number | null;
    name: string;
    location: string | null;
    logo: string | null;
}

export interface Division {
    id: number;
    name: string;
}

// Note: Player uses original field names to maintain
// compatibility with existing data in KV store and client
export interface Player {
    id: number;
    name: string;
    firstName: string;
    lastName: string;
    team_id: number;
    pos: string[];
    stats: Record<string, Record<string, number>>;
    projections: Record<string, number> | null;
    headshot: string;
    ownership: number;
    averageDraftPosition: number | null;
    percentChange: number | null;
    injuryStatus: string | null;
    age: number | null;
    birthDate: string | null;
}

// Note: Ranking uses camelCase for stored field names to maintain
// compatibility with existing data in KV store
export interface Ranking {
    id: string;
    author: string | null;
    description: string | null;
    pin: string | null;
    createdAt: number;
    updatedAt: number;
    players: Record<string, {
        rank: number;
        ignore: boolean;
        highlight: boolean;
    }>;
}

export interface PlayerDetails {
    id: number;
    full_name: string;
    first_name: string;
    last_name: string;
    injury_status: string | null;
    default_position_id: number;
    eligible_slots: number[];
    pro_team_id: number;
    ownership: number;
    average_draft_position: number | null;
    percent_change: number | null;
    birth_date: string | null;
    age: number | null;
}

export interface PlayerData {
    stats: Record<number, any>;
    player_details: Record<number, PlayerDetails>;
}
