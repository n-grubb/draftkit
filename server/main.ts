/**
 * MLB Fantasy Baseball Draft Tool Server
 *
 * DATA SOURCES FOR HISTORICAL STATS:
 *
 * 1. MLB Stats API (https://statsapi.mlb.com/api/)
 *    - Official MLB data with comprehensive player information
 *    - Requires authentication for full access
 *
 * 2. Baseball-Reference
 *    - Not a public API but data can be scraped
 *    - Contains 3+ years of historical data
 *
 * 3. FanGraphs
 *    - Contains both current season and historical data
 *    - Also has projections from multiple systems
 *
 * 4. Baseball Savant
 *    - Advanced statistics and Statcast data
 *
 * 5. ESPN Fantasy API (currently used)
 *    - Limited to recent years only
 *
 * Historical stats are currently fetched from FanGraphs leaders API (2024, 2025 seasons)
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
