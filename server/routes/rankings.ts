/**
 * User ranking routes
 */

import { Hono } from 'jsr:@hono/hono';
import type { Ranking } from '../types.ts';
import { get_ranking, store_ranking, ranking_id_exists } from '../services/storage.ts';

const rankings_router = new Hono();

/**
 * Generate a unique 4-digit ranking ID
 */
async function generate_unique_ranking_id(): Promise<string> {
    let id: string;
    let exists = true;

    while (exists) {
        id = Math.floor(1000 + Math.random() * 9000).toString();
        exists = await ranking_id_exists(id);
    }

    return id!;
}

/**
 * Validate PIN format (4-6 digits)
 */
function is_valid_pin(pin: string): boolean {
    return /^\d{4,6}$/.test(pin);
}

/**
 * Remove PIN from ranking before returning to client
 */
function sanitize_ranking(ranking: Ranking): Omit<Ranking, 'pin'> {
    const { pin, ...safe_ranking } = ranking;
    return safe_ranking;
}

/**
 * GET /ranking/:id
 * Returns a specific ranking by ID (without PIN)
 */
rankings_router.get('/:id', async (c) => {
    const id = c.req.param('id');
    const ranking = await get_ranking(id);

    if (!ranking) {
        return c.json({ error: 'Ranking not found' }, 404);
    }

    return c.json(sanitize_ranking(ranking));
});

/**
 * POST /ranking
 * Create a new ranking
 */
rankings_router.post('/', async (c) => {
    try {
        const body = await c.req.json();
        const { players, author = 'Anonymous', description = '', pin = null } = body;

        if (!players || typeof players !== 'object') {
            return c.json({ error: 'Invalid players data' }, 400);
        }

        if (pin && !is_valid_pin(pin)) {
            return c.json({ error: 'PIN must be 4-6 digits' }, 400);
        }

        const id = await generate_unique_ranking_id();
        const now = Date.now();

        const ranking: Ranking = {
            id,
            author: author || null,
            description: description || null,
            pin: pin || null,
            createdAt: now,
            updatedAt: now,
            players,
        };

        await store_ranking(ranking);

        return c.json(sanitize_ranking(ranking));
    } catch (error) {
        console.error('Error creating ranking:', error);
        return c.json({ error: 'Failed to create ranking' }, 500);
    }
});

/**
 * PUT /ranking/:id
 * Update an existing ranking (PIN required if set)
 */
rankings_router.put('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const { players, author, description, pin } = body;

        const existing_ranking = await get_ranking(id);

        if (!existing_ranking) {
            return c.json({ error: 'Ranking not found' }, 404);
        }

        if (existing_ranking.pin && existing_ranking.pin !== pin) {
            return c.json({ error: 'Invalid PIN' }, 403);
        }

        const updated_ranking: Ranking = {
            ...existing_ranking,
            author: author ?? existing_ranking.author,
            description: description ?? existing_ranking.description,
            players: players ?? existing_ranking.players,
            updatedAt: Date.now(),
        };

        await store_ranking(updated_ranking);

        return c.json(sanitize_ranking(updated_ranking));
    } catch (error) {
        console.error('Error updating ranking:', error);
        return c.json({ error: 'Failed to update ranking' }, 500);
    }
});

export default rankings_router;
