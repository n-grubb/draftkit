/**
 * NFL Fantasy Football Draft Tool Server
 *
 * DATA SOURCES:
 *
 * 1. ESPN Fantasy API (ffl / kona_player_info view)
 *    - Full fantasy-relevant player universe, positions, ownership, ADP
 *    - Projected stats (statSourceId 1) and prior-season actuals (statSourceId 0)
 *
 * 2. FantasyPros (NFL, PPR)
 *    - Expert Consensus Rankings (ECR) and ADP, scraped from public pages
 *
 * Fantasy points are computed from raw ESPN stats using PPR scoring
 * (see server/constants.ts -> PPR_SCORING) so the result does not depend on
 * which ESPN league's scoring the request happens to use.
 */

import { Hono } from 'jsr:@hono/hono';
import { cors } from 'jsr:@hono/hono/cors';

import teams_router from './routes/teams.ts';
import players_router from './routes/players.ts';
import rankings_router from './routes/rankings.ts';
import admin_router from './routes/admin.ts';
import { get_player_versionstamp } from './services/storage.ts';

const app = new Hono();

// Middleware
app.use('*', cors());

// Mount routes
app.route('/teams', teams_router);
app.route('/players', players_router);
app.route('/ranking', rankings_router);
app.route('/admin', admin_router);

// Keep /metadata at root for backwards compatibility
app.get('/metadata', async (c) => {
    const versionstamp = await get_player_versionstamp(30951);
    return c.json({ lastUpdated: versionstamp });
});

// Start server
Deno.serve(app.fetch);
