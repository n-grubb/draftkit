/**
 * Team and division routes
 */

import { Hono } from 'jsr:@hono/hono';
import { get_all_teams, get_all_divisions } from '../services/storage.ts';

const teams_router = new Hono();

/**
 * GET /teams
 * Returns all teams and divisions
 */
teams_router.get('/', async (c) => {
    const teams = await get_all_teams();
    const divisions = await get_all_divisions();

    return c.json({ teams, divisions });
});

export default teams_router;
