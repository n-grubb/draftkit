/**
 * Player routes
 */

import { Hono } from 'jsr:@hono/hono';
import { get_all_players, get_player_versionstamp } from '../services/storage.ts';

const players_router = new Hono();

/**
 * GET /players
 * Returns all players sorted by ownership
 */
players_router.get('/', async (c) => {
    const players = await get_all_players();

    return c.json({ players });
});

/**
 * GET /metadata
 * Returns metadata about the player data (last updated timestamp)
 */
players_router.get('/metadata', async (c) => {
    // Check Bryce Harper as a reference player
    const versionstamp = await get_player_versionstamp(30951);

    return c.json({ lastUpdated: versionstamp });
});

export default players_router;
