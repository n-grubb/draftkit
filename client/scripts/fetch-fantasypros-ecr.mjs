#!/usr/bin/env node
/**
 * Fetch FantasyPros NFL PPR Expert Consensus Rankings (ECR) and write a
 * snapshot the football app bundles at build time.
 *
 * FantasyPros can't be fetched from the browser (no CORS) and often can't be
 * reached from CI sandboxes, so run this locally when you want fresh ECR:
 *
 *     cd client && npm run fetch:ecr
 *
 * Then rebuild / redeploy. Output: src/features/sports/data/fantasyprosEcr.json
 */

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const PAGE_URL = 'https://www.fantasypros.com/nfl/rankings/ppr-cheatsheets.php'
const OUT_PATH = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../src/features/sports/data/fantasyprosEcr.json'
)

function normalizePosition(raw) {
    const pos = String(raw || '').trim().toUpperCase().replace(/\d+$/, '')
    if (pos === 'DEF' || pos === 'D/ST' || pos === 'DEFENSE') return 'DST'
    if (pos === 'PK') return 'K'
    return pos
}

// Pull the embedded ecrData JSON out of the page's HTML.
function extractEcrData(html) {
    const m = html.match(/var\s+ecrData\s*=\s*(\{[\s\S]*?\});/)
    if (m) {
        try {
            return JSON.parse(m[1])
        } catch (err) {
            console.warn('Found ecrData but failed to parse it:', err.message)
        }
    }
    return null
}

async function main() {
    console.log(`Fetching ${PAGE_URL} …`)
    const res = await fetch(PAGE_URL, {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
    })

    if (!res.ok) {
        throw new Error(`FantasyPros request failed: ${res.status} ${res.statusText}`)
    }

    const html = await res.text()
    const data = extractEcrData(html)

    if (!data || !Array.isArray(data.players)) {
        throw new Error(
            'Could not find ecrData in the page. FantasyPros may have changed its markup — ' +
            'check the page source for the rankings variable and update this script.'
        )
    }

    const players = data.players
        .map((p) => {
            const posRaw = p.player_position_id || p.pos || ''
            const posRankNum = parseInt(String(p.pos_rank || '').replace(/[^0-9]/g, ''), 10)
            return {
                name: p.player_name || p.name || '',
                team: p.player_team_id || p.team || '',
                pos: normalizePosition(posRaw),
                rank: Number(p.rank_ecr ?? p.rank ?? 0) || null,
                posRank: Number.isFinite(posRankNum) ? posRankNum : null,
            }
        })
        .filter((p) => p.name && p.rank)

    players.sort((a, b) => a.rank - b.rank)

    const output = {
        updated: new Date().toISOString(),
        scoring: 'PPR',
        source: PAGE_URL,
        players,
    }

    await writeFile(OUT_PATH, JSON.stringify(output, null, 2) + '\n')
    console.log(`Wrote ${players.length} ranked players to ${OUT_PATH}`)
}

main().catch((err) => {
    console.error('Failed to fetch FantasyPros ECR:', err.message)
    process.exit(1)
})
