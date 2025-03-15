import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";

/**
 * MLB Fantasy Baseball Draft Tool Server
 * 
 * DATA SOURCES FOR HISTORICAL STATS:
 * 
 * 1. MLB Stats API (https://statsapi.mlb.com/api/)
 *    - Official MLB data with comprehensive player information
 *    - Requires authentication for full access
 *    - Example: https://statsapi.mlb.com/api/v1/people/{playerId}/stats?stats=statSplits&group=hitting&season=2023
 * 
 * 2. Baseball-Reference
 *    - Not a public API but data can be scraped
 *    - Contains 3+ years of historical data
 *    - Has player ages, birthdays and comprehensive stats
 * 
 * 3. FanGraphs
 *    - Contains both current season and historical data
 *    - Also has projections from multiple systems
 *    - Example: https://www.fangraphs.com/api/players/stats?playerid={playerId}&position=all&stats=bat
 * 
 * 4. Baseball Savant
 *    - Advanced statistics and Statcast data
 *    - Great for advanced metrics, less for basic stats
 *
 * 5. ESPN Fantasy API (currently used)
 *    - Limited to recent years only
 *    - Doesn't provide full player histories
 *
 * TODO: Implement comprehensive historical stats from one of the above sources
 */

const app = new Hono();
const kv = await Deno.openKv();

/* ------------------
 * TYPEDEFS
 * ------------------ */

interface Team {
    id: number,
    abbrev: string,
    division_id: number | null, 
    name: string,
    location: string | null,
    logo: string | null
}

interface Division {
    id: number,
    name: string
}

interface ESPNPlayer {
    defaultPositionId: number,
    droppable: boolean,
    eligibleSlots: number[],
    firstName: string,
    fullName: string,
    id: number,
    lastName: string,
    ownership: { 
        percentOwned: number
    },
    proTeamId: number,
    universeId: number
}

interface ESPNStats {}
interface FangraphsProjection {} 

interface Player {
    id: number,
    name: string,
    firstName: string,
    lastName: string,
    team_id: number, 
    pos: string[],
    stats: Record<string, any>,
    projections: Record<string, any> | null,
    headshot: string,
    ownership: number,
    averageDraftPosition: number | null,
    percentChange: number | null,
    injuryStatus: string | null,
    age: number | null,
    birthDate: string | null
}

interface Ranking {
    id: string,             // 4-digit ID for sharing
    author: string | null,  // Author name or null for anonymous
    description: string | null, // Optional description
    pin: string | null,     // Pin code for editing
    createdAt: number,      // Timestamp
    updatedAt: number,      // Timestamp
    players: Record<string, {
        rank: number,
        ignore: boolean,
        highlight: boolean
    }>
}

/*

We keep a few source data tables 
to generate the data sent to the client.

|-------------|-----------------|
| Table       | Usage           |
|-------------|-----------------|
| rankings    | user data       | 
| teams       | -> source data  |
| divisions   | -> source data  |
| playerlist  | source data     |
| stats       | source data     |
| projections | source data     |
| players     | -> custom data  |
| ???         | metadata        |
|-------------------------------|

Key:
-> : indicates data sent to the client

*/

/* ------------------
 * APP ROUTER
 * ------------------ */

app.use('*', cors());

/**
 * Returns the source data as JSON
 */
app.get('/teams', async (c) => {
    let teams = [];
    let divisions = [];

    let entries = kv.list({ prefix: ['teams'] });
    for await (let team of entries) {
        teams.push(team.value);
    }
    entries = kv.list({ prefix: ['divisions'] });
    for await (let division of entries) {
        divisions.push(division.value);
    }

    return c.json({
        teams,
        divisions
    });
});

app.get('/players', async (c) => {
    let players = [];

    let entries = kv.list({ prefix: ['players']});
    for await (let player of entries) {
        players.push(player.value);
    }
    await players.sort((a,b) => b.ownership - a.ownership);

    return c.json({
        players
    });
});

app.get('/metadata', async (c) => {
    let data = await kv.get(['players', 30951]); // Check Bryce Harper
    
    return c.json({
        lastUpdated: data.versionstamp
    });
});

/**
 * Generate a unique 4-digit ranking ID that doesn't exist yet
 */
function generateUniqueRankingId(): Promise<string> {
    return new Promise(async (resolve) => {
        let id: string;
        let exists = true;
        
        // Keep trying until we find an unused ID
        while (exists) {
            // Generate a random 4-digit number
            id = Math.floor(1000 + Math.random() * 9000).toString();
            
            // Check if this ID already exists
            const entry = await kv.get(['rankings', id]);
            exists = entry.value !== null;
        }
        
        resolve(id);
    });
}

/**
 * Validates a PIN - must be 4-6 digits
 */
function isValidPin(pin: string): boolean {
    return /^\d{4,6}$/.test(pin);
}

/**
 * Returns a specific user ranking by id as JSON
 */
app.get('/ranking/:id', async (c) => {
    const id = c.req.param('id');
    
    // Get the ranking
    const entry = await kv.get(['rankings', id]);
    if (!entry.value) {
        return c.json({ error: 'Ranking not found' }, 404);
    }
    
    // Remove the PIN before returning
    const ranking = entry.value as Ranking;
    const { pin, ...safeRanking } = ranking;
    
    return c.json(safeRanking);
});

/**
 * Create a new ranking
 */
app.post('/ranking', async (c) => {
    try {
        const body = await c.req.json();
        const { players, author = 'Anonymous', description = '', pin = null } = body;
        
        // Basic validation
        if (!players || typeof players !== 'object') {
            return c.json({ error: 'Invalid players data' }, 400);
        }
        
        // Validate PIN if provided
        if (pin && !isValidPin(pin)) {
            return c.json({ error: 'PIN must be 4-6 digits' }, 400);
        }
        
        // Generate a new unique ID
        const id = await generateUniqueRankingId();
        const now = Date.now();
        
        // Create the ranking
        const ranking: Ranking = {
            id,
            author: author || null,
            description: description || null,
            pin: pin || null,
            createdAt: now,
            updatedAt: now,
            players
        };
        
        // Store it
        await kv.set(['rankings', id], ranking);
        
        // Return without the PIN
        const { pin: _, ...safeRanking } = ranking;
        return c.json(safeRanking);
    } catch (error) {
        console.error('Error creating ranking:', error);
        return c.json({ error: 'Failed to create ranking' }, 500);
    }
});

/**
 * Update an existing ranking
 * PIN is required for updates
 */
app.put('/ranking/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const { players, author, description, pin } = body;
        
        // Get the existing ranking
        const entry = await kv.get(['rankings', id]);
        if (!entry.value) {
            return c.json({ error: 'Ranking not found' }, 404);
        }
        
        const existingRanking = entry.value as Ranking;
        
        // Check PIN
        if (existingRanking.pin && existingRanking.pin !== pin) {
            return c.json({ error: 'Invalid PIN' }, 403);
        }
        
        // Update the ranking
        const updatedRanking: Ranking = {
            ...existingRanking,
            author: author ?? existingRanking.author,
            description: description ?? existingRanking.description,
            players: players ?? existingRanking.players,
            updatedAt: Date.now()
        };
        
        // Store it
        await kv.set(['rankings', id], updatedRanking);
        
        // Return without the PIN
        const { pin: _, ...safeRanking } = updatedRanking;
        return c.json(safeRanking);
    } catch (error) {
        console.error('Error updating ranking:', error);
        return c.json({ error: 'Failed to update ranking' }, 500);
    }
});

/** 
 * Admin routes
 * Returns an html page of the all of the server data
 *   - Overview 
 *   - Players table 
 *   - All rankings & stats
 */
app.get('/admin', (c) => c.html())

/**
 * Manually triggers a data refresh.
 * Accepts options of specific datasets to refresh.  
 * TODO: Setup criteria
 */
app.get('/admin/refresh', async (c) => {
    const VALID_SOURCES = ['teams', 'stats', 'projections', 'historical'];
    const sources_to_update = ['teams', 'stats', 'projections'];

    // Validate sources_to_update
    if (sources_to_update.length < 1) {
        return c.text('No sources were updated.')
    }
    if (sources_to_update.some(source_id => !VALID_SOURCES.includes(source_id))) {
        return c.text('Invalid data source.', 503);
    }

    // Fetch teams and divisions
    let teams: Team[] = [];
    let divisions: Division[] = []; 
    if (sources_to_update.includes('teams')) {
        const {teams: fetchedTeams, divisions: fetchedDivisions} = await fetchTeamsAndDivisions();
        teams = fetchedTeams;
        divisions = fetchedDivisions;
        storeTeamsAndDivisions(teams, divisions);
        console.log('Teams & divisions refreshed.');
    } else {
        let entries = kv.list({ prefix: ['teams'] });
        for await (let team of entries) {
            teams.push(team.value);
        }
        entries = kv.list({ prefix: ['divisions'] });
        for await (let division of entries) {
            divisions.push(division.value);
        }
    }
    console.log(`Teams found: ${teams.length}`);
    console.log(`Divisions found: ${divisions.length}`);

    // Fetch player stats and details - this now includes both stats and player data
    let playerStats = {};
    let playerDetails = {};
    if (sources_to_update.includes('stats')) {
        const playerData = await fetchPlayerStats();
        playerStats = playerData.stats;
        playerDetails = playerData.playerDetails;
        storePlayerStats(playerData);
        console.log('Player stats and details refreshed.');
    } else {
        // Load stats
        let entries = kv.list({ prefix: ['stats']});
        for await (let entry of entries) {
            playerStats[entry.key[1]] = entry.value;
        }
        
        // Load player details
        entries = kv.list({ prefix: ['players']});
        for await (let entry of entries) {
            playerDetails[entry.key[1]] = entry.value;
        }
    }
    console.log(`Stats found for players: ${Object.keys(playerStats).length}`);
    console.log(`Player details found: ${Object.keys(playerDetails).length}`);

    // Fetch historical data if requested
    let historicalStats = {};
    if (sources_to_update.includes('historical')) {
        historicalStats = await fetchHistoricalStats(Object.values(playerDetails));
        storeHistoricalStats(historicalStats);
        console.log('Historical stats refreshed.');
    } else {
        let entries = kv.list({ prefix: ['historical']});
        for await (let entry of entries) {
            historicalStats[entry.key[1]] = entry.value;
        }
    }
    console.log(`Historical stats found for players: ${Object.keys(historicalStats).length}`);

    // Fetch projections if requested
    let projections = {};
    if (sources_to_update.includes('projections')) {
        let all_projections = await fetchFangraphProjections();
        projections = await buildAndStorePlayerProjections(all_projections, Object.values(playerDetails));
    } else {
        let entries = kv.list({ prefix: ['projections']});
        for await (let entry of entries) {
            projections[entry.key[1]] = entry.value;
        }
    }
    console.log(`Projections found: ${Object.keys(projections).length}`);

    // Our custom player store is built from all of the above data sources
    const players = await buildCustomPlayerStore(
        teams, 
        divisions, 
        Object.values(playerDetails),
        playerStats, 
        projections,
        historicalStats
    );
    await storeCustomPlayers(players);

    return c.json(players);
});

Deno.serve(app.fetch);


/* ------------------
 * DATA OPERATIONS
 * ------------------ */

/*
 * Retrieve teams & divisions from ESPN. 
 */
async function fetchTeamsAndDivisions() {
    const url = 'https://site.web.api.espn.com/apis/site/v2/teams?region=us&lang=en&leagues=mlb';
    let response = await fetch(url);
    
    if (!response.ok) {
        throw new Error('Failed to fetch teams & divisions.');
    }

    let teams_and_divisions = await response.json();
    let teams = new Map();
    let divisions = new Map();

    // Add a "Free Agent" team as the first team in the array.
    teams.set('FA', {
        id: 0,
        abbrev: 'FA',
        division_id: null, 
        name: 'Free Agent',
        location: null,
        logo: null
    });

    teams_and_divisions.mlb.forEach((division, i) => {
        divisions.set(i, { id: i, name: division.name });
        division.teams.forEach(team => {
            teams.set(team.id, {
                id: team.id,
                abbrev: team.abbreviation,
                division_id: i, 
                name: team.name,
                location: team.location,
                logo: team.logo
            })
        })
    });

    return { teams, divisions };
}

/** 
 * Update the KV stores for teams & divisions.
 */
function storeTeamsAndDivisions(teams: Team[], divisions: Division[]) {
    console.log("Update teams & divisions stores...");
    for (let [team_id, team] of teams) {
        kv.set(['teams', parseInt(team.id)], team)
    }
    for (let [division_id, division] of divisions) {
        kv.set(['divisions', division.id], division)
    }
}

/*
 * Retrieve MLB players from ESPN. 
 */
async function fetchMLBPlayerList() {
    // TODO: update to 2025?
    const url = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/flb/seasons/2025/players?scoringPeriodId=0&view=players_wl';
    let response = await fetch(url, {
        headers: {
            'x-fantasy-filter': '{"filterActive":{"value":true}}'
        } 
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch player data.', {response});
    }

    let players = [];
    let all_players = await response.json();


    // Filters out players with <1% ownership to keep things lean.
	// TODO: reassess in the future.
	players = all_players
		.filter(p => p.ownership?.percentOwned > 1)
		.sort((a,b) => b.ownership.percentOwned - a.ownership.percentOwned);

    return players;
}

/** 
 * Update the KV store for the list of players.
 */
function storePlayerList(playerlist: ESPNPlayer[] ) {
    for (let player of playerlist) {
        kv.set(['playerlist', parseInt(player.id)], player)
    }
}

/** 
 * Fetch player stats from ESPN
 * @returns {Object} - Returns object with player stats and additional player data
 */
async function fetchPlayerStats() {
    const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/flb/seasons/2025/segments/0/leagues/3850?view=kona_player_info`;
    
    // First fetch batters
    let response = await fetch(url, {
        headers: {
            'x-fantasy-filter': '{"players":{"filterSlotIds":{"value":[0,1,2,3,4,5,6,7,8,9,10,11,12,17]},"filterRanksForScoringPeriodIds":{"value":[162]},"sortPercOwned":{"sortPriority":1,"sortAsc":false},"limit":500}}'
        } 
    });
    if (!response.ok) {
        throw new Error('Failed to fetch batter stats.', {response});
    }
    let batter_stats = await response.json();

    // Then fetch pitchers
    response = await fetch(url, {
        headers: {
            'x-fantasy-filter': '{"players":{"filterSlotIds":{"value":[13,14,15,17]},"filterRanksForScoringPeriodIds":{"value":[162]},"sortPercOwned":{"sortPriority":1,"sortAsc":false},"limit":400}}'
        } 
    });
    if (!response.ok) {
        throw new Error('Failed to fetch pitcher stats.', {response});
    }
    let pitcher_stats = await response.json();

    // Process all players (combining batters and pitchers)
    let stats = {};
    let playerDetails = {};
    
    // Process batters
    batter_stats.players.forEach(batter => {
        stats[batter.id] = batter.player.stats;
        
        // Extract additional player details
        playerDetails[batter.id] = {
            id: batter.id,
            fullName: batter.player.fullName,
            firstName: batter.player.firstName,
            lastName: batter.player.lastName,
            injuryStatus: batter.player.injuryStatus,
            defaultPositionId: batter.player.defaultPositionId,
            eligibleSlots: batter.player.eligibleSlots || [],
            proTeamId: batter.player.proTeamId,
            ownership: batter.player.ownership?.percentOwned || 0,
            averageDraftPosition: batter.player.ownership?.averageDraftPosition || null,
            percentChange: batter.player.ownership?.percentChange || null,
            birthDate: batter.player.dateOfBirth,
            age: calculateAge(batter.player.dateOfBirth)
        };
    });
    
    // Process pitchers
    pitcher_stats.players.forEach(pitcher => {
        stats[pitcher.id] = pitcher.player.stats;
        
        // Extract additional player details if not already captured
        if (!playerDetails[pitcher.id]) {
            playerDetails[pitcher.id] = {
                id: pitcher.id,
                fullName: pitcher.player.fullName,
                firstName: pitcher.player.firstName,
                lastName: pitcher.player.lastName,
                injuryStatus: pitcher.player.injuryStatus,
                defaultPositionId: pitcher.player.defaultPositionId,
                eligibleSlots: pitcher.player.eligibleSlots || [],
                proTeamId: pitcher.player.proTeamId,
                ownership: pitcher.player.ownership?.percentOwned || 0,
                averageDraftPosition: pitcher.player.ownership?.averageDraftPosition || null,
                percentChange: pitcher.player.ownership?.percentChange || null,
                birthDate: pitcher.player.dateOfBirth,
                age: calculateAge(pitcher.player.dateOfBirth)
            };
        }
    });

    return { stats, playerDetails };
}

/**
 * Calculate age from birthdate
 * @param {string} dateOfBirth - Format YYYY-MM-DD
 * @returns {number|null} - Age or null if invalid date
 */
function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    
    try {
        const birthDate = new Date(dateOfBirth);
        const today = new Date();
        
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        // Adjust age if birthday hasn't occurred yet this year
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    } catch (e) {
        console.error("Error calculating age:", e);
        return null;
    }
}

/** 
 * Update the KV store of player stats and player details
 */
function storePlayerStats(playerData: { stats: any, playerDetails: any }) {
    // Store stats
    for (const [playerId, playerStats] of Object.entries(playerData.stats)) {
        kv.set(['stats', parseInt(playerId)], playerStats);
    }
    
    // Store player details (this replaces the need for separate playerlist)
    for (const [playerId, details] of Object.entries(playerData.playerDetails)) {
        kv.set(['players', parseInt(playerId)], details);
    }
}

async function fetchFangraphProjections() {
    // We dont have a map of ESPN -> MLBIDs, so we can build this information off full name.
    // If there are more than one occurence of the same name.. use a second qualifies (TEAM/AGE/POS?)  
    let batter_projections_url = 'https://www.fangraphs.com/api/projections?pos=all&stats=bat&type=steamer';
    let response = await fetch(batter_projections_url);
    if (!response.ok) {
        throw new Error('Failed to fetch batter projections.', {response});
    }
    let batter_projections = await response.json();

    let pitcher_projections_url = 'https://www.fangraphs.com/api/projections?pos=all&stats=pit&type=steamer';
    response = await fetch(pitcher_projections_url);
    if (!response.ok) {
        throw new Error('Failed to fetch pitcher projections.', {response});
    }
    let pitcher_projections = await response.json();
    
    return [batter_projections, pitcher_projections];
}

/** 
 * Update the KV store of player projections
 * @returns projections - projections by player
 */
function buildAndStorePlayerProjections(projections: any[], playerDetails: any[]) {
    const [batting_projections, pitching_projections] = projections;

    const player_projections = {}
    playerDetails.forEach(player => {     
        let projection = {};
        
        // Check if this player is a batter
        if (player.eligibleSlots?.includes(12)) { // UTIL slot indicates a batter
            let batting = batting_projections.find(b => 
                replaceAccentedCharacters(b.PlayerName) === replaceAccentedCharacters(player.fullName)
            );
            
            if (batting) {
                projection = {
                    ...batting,
                    'bBB': batting['BB'],
                    'KO': batting['SO'],
                };
            }
        }

        // Check if this player is a pitcher
        if (player.eligibleSlots?.includes(13)) { // P slot indicates a pitcher
            let pitching = pitching_projections.find(p => 
                replaceAccentedCharacters(p.PlayerName) === replaceAccentedCharacters(player.fullName)
            );
            
            if (pitching) {
                projection = {
                    ...projection,
                    ...pitching,
                    ['R']: projection?.R || 0,
                    ['HR']: projection?.HR || 0, // Keep batter HR if exists
                    ['HRA']: pitching.HR  // Add pitcher HR allowed
                };
            }
        }

        if (Object.keys(projection).length < 1) {
            kv.delete(['projections', player.id]);
        } else {
            kv.set(['projections', player.id], projection);
        }
        
        player_projections[player.id] = projection;
    });

    return player_projections;
}

function replaceAccentedCharacters(name: string) {
    return name.normalize('NFD')
               .replace(/[\u0300-\u036f]/g, '');
}
/**
 * Fetch historical stats for players (3-year history)
 * This demonstrates how to fetch historical stats from Baseball Reference
 * You may need to adjust based on the actual data source you choose
 */
async function fetchHistoricalStats(playerDetails: any[]) {
    const historicalStats = {};
    
    // For demo purposes - in a real implementation you would fetch from a source
    // Possible sources:
    // - Baseball Reference via their API or scraping
    // - FanGraphs historical data
    // - MLB Stats API (requires key/authentication)
    // - Baseball Savant (Statcast data)
    
    // console.log("To implement historical stats, you could use one of these sources:");
    // console.log("1. Baseball Reference: https://www.baseball-reference.com/");
    // console.log("2. FanGraphs: https://www.fangraphs.com/");
    // console.log("3. MLB Stats API: https://statsapi.mlb.com/api/");
    // console.log("4. Baseball Savant (Statcast): https://baseballsavant.mlb.com/");
    
    // For now, return empty historical stats to not break the flow
    // In a full implementation, you would iterate through players and fetch their stats
    return historicalStats;
}

/**
 * Store historical stats in KV store
 */
function storeHistoricalStats(historicalStats: any) {
    for (const [playerId, stats] of Object.entries(historicalStats)) {
        kv.set(['historical', parseInt(playerId)], stats);
    }
}

/**
 * Create a player object in a shape that makes it easy to
 * sort & display info on the client.  
 */
async function buildCustomPlayerStore(
    teams: Team[], 
    divisions: Division[], 
    playerDetails: any[], 
    stats: any, 
    projections: any,
    historicalStats: any = {}
) {
    const players: Player[] = playerDetails.map(player => {
        return { 
            id: player.id,
            name: player.fullName,
            firstName: player.firstName,
            lastName: player.lastName,
            team_id: player.proTeamId, 
            pos: formatPositionEligibility(player.eligibleSlots),
            stats: formatPlayerStats(stats[player.id]),
            projections: formatProjections(projections[player.id]),
            headshot: `https://a.espncdn.com/combiner/i?img=/i/headshots/mlb/players/full/${player.id}.png?w=96&h=70&cb=1`,
            ownership: player.ownership || 0,
            averageDraftPosition: player.averageDraftPosition || null,
            percentChange: player.percentChange || null,
            injuryStatus: player.injuryStatus || null,
            age: player.age || null,
            birthDate: player.birthDate || null
        }
    });
    
    await players.sort((a,b) => b.ownership - a.ownership);
    return players;
}

/* UTILITIES */

/**
 * Check if the player has an elibile slot associated with all batters. 
 */
function isBatter(player: ESPNPlayer) {
    return player.eligibleSlots?.includes(12); // UTIL
}

/**
 * Check if the player has an elibile slot associated with all pitchers. 
 */
function isPitcher(player: ESPNPlayer) {
    return player.eligibleSlots?.includes(13); // P
}

/**
 * Take the list of eligibleSlot IDs and return a list of position strings.
 */
function formatPositionEligibility(eligible_slots: string[]) {
    const POS_MAP = {
        0: 'C',
        1: '1B',
        2: '2B',
        3: '3B',
        4: 'SS',
        5: 'OF',
        6: '2B/SS',
        7: '1B/3B',
        8: 'LF',
        9: 'CF',
        10: 'RF',
        11: 'DH',
        12: 'UTIL',
        13: 'P',
        14: 'SP',
        15: 'RP',
        16: 'BE',
        17: 'IL',
        18: 'INV',
        19: 'IF',
        20: 'B',
        21: 'P',
        22: 'MISC'
    };
    const IGNORED_POS = [
        // --
        // These positions are covered by other positions. 
        8, // LF
        9, // CF
        10, // RF
        // --
        // The following positions aren't used.
        16, 
        17,
        18,
        19,
        20,
        21,
        22
    ];
    return eligible_slots
        .filter(p => !IGNORED_POS.includes(p))
        .map(p => POS_MAP[p]);
}

/**
 * Format player stats from ESPN data
 * Extracts stats for multiple years if available
 */
function formatPlayerStats(stats) {
    if (!stats || !Array.isArray(stats)) {
        return {};
    }
    
    const player_stats = {};
    
    // Look for stats from multiple years (ESPN format uses "00YYYY" for year identifiers)
    // Regular season stats usually use "00" prefix while playoff stats use other prefixes
    const yearPattern = /^00(\d{4})$/;
    
    // Find all available years in the stats data
    const availableYears = stats
        .filter(ps => ps && ps.id && yearPattern.test(ps.id))
        .map(ps => {
            const match = ps.id.match(yearPattern);
            return match ? parseInt(match[1]) : null;
        })
        .filter(year => year !== null);
    
    // Process each year's stats
    availableYears.forEach(year => {
        const yearStats = stats.find(ps => ps.id === `00${year}`)?.stats;
        if (yearStats) {
            player_stats[year] = getApplicableStats(yearStats);
        }
    });
    
    return player_stats;
}

/** 
 * Take an ESPN stat object (for a year) and grab only the stats we care about. 
 */
function getApplicableStats(statYear) {
    const STAT_MAP = {
        'AB'  : 0,
        'PA'  : 16,
        'R'   : 20,
        'HR'  : 5,
        'RBI' : 21,
        'SB'  : 23,
        'OBP' : 17,
        'AVG' : 2,
        'KO'  : 27,
        'CS'  : 24,
        'OPS' : 18,
        'SLG' : 9,
        'XBH' : 6,
        'IP'  : 34,
        'K'   : 48,
        'W'   : 53,
        'ERA' : 47,
        'WHIP': 41,
        'SVHD': 83,
        'HD'  : 59,
        'SV'  : 57,
        'QS'  : 63,
        'CG'  : 62,
        'K/9' : 49,
        'BB'  : 39,
        'K/BB': 82,
        'SV%' : 59,
        'BS'  : 58,
        'IRS' : 61,
        'HRA' : 46,
    }
    let applicable_stats = {}
    
    if (isBatter) {
        applicable_stats['AB']    = statYear[STAT_MAP['AB']]   || 0;
        applicable_stats['PA']    = statYear[STAT_MAP['PA']]   || 0;
        applicable_stats['R']     = statYear[STAT_MAP['R']]    || 0;
        applicable_stats['HR']    = statYear[STAT_MAP['HR']]   || 0;
        applicable_stats['RBI']   = statYear[STAT_MAP['RBI']]  || 0;
        applicable_stats['SB']    = statYear[STAT_MAP['SB']]   || 0;
        applicable_stats['OBP']   = statYear[STAT_MAP['OBP']]  || 0;
        applicable_stats['AVG']   = statYear[STAT_MAP['AVG']]  || 0;
        applicable_stats['KO']    = statYear[STAT_MAP['KO']]   || 0;
        applicable_stats['CS']    = statYear[STAT_MAP['CS']]   || 0;
        applicable_stats['OPS']   = statYear[STAT_MAP['OPS']]  || 0;
        applicable_stats['SLG']   = statYear[STAT_MAP['SLG']]  || 0;
        applicable_stats['XBH']   = statYear[STAT_MAP['XBH']]  || 0;
    }
    if (isPitcher) {
        applicable_stats['IP']   = statYear[STAT_MAP['IP']]   || 0;
        applicable_stats['K']    = statYear[STAT_MAP['K']]    || 0;
        applicable_stats['W']    = statYear[STAT_MAP['W']]    || 0;
        applicable_stats['ERA']  = statYear[STAT_MAP['ERA']]  || 0;
        applicable_stats['WHIP'] = statYear[STAT_MAP['WHIP']] || 0;
        applicable_stats['SVHD'] = statYear[STAT_MAP['SVHD']] || 0;
        applicable_stats['HD']   = statYear[STAT_MAP['HD']]   || 0;
        applicable_stats['SV']   = statYear[STAT_MAP['SV']]   || 0;
        applicable_stats['QS']   = statYear[STAT_MAP['QS']]   || 0;
        applicable_stats['BB']   = statYear[STAT_MAP['BB']]   || 0;
        applicable_stats['K/9']  = statYear[STAT_MAP['K/9']]  || 0;
        applicable_stats['K/BB'] = statYear[STAT_MAP['K/BB']] || 0;
        applicable_stats['BS']   = statYear[STAT_MAP['BS']]   || 0;
        applicable_stats['HRA']  = statYear[STAT_MAP['HRA']]  || 0;
        // applicable_stats['CG']   = statYear[STAT_MAP['CG']]   || 0;
        // applicable_stats['SV%']  = statYear[STAT_MAP['SV%']]  || 0;
        // applicable_stats['IRS']  = statYear[STAT_MAP['IRS']]  || 0;
    }
    return applicable_stats;
}

function formatProjections(projection) {
    const formatted_projection = {}

    if (!projection) {
        return {};
    }
    
    formatted_projection['AB']   = projection['AB']   || 0;
    formatted_projection['PA']   = projection['PA']   || 0;
    formatted_projection['R']    = projection['R']    || 0;
    formatted_projection['HR']   = projection['HR']   || 0;
    formatted_projection['RBI']  = projection['RBI']  || 0;
    formatted_projection['SB']   = projection['SB']   || 0;
    formatted_projection['OBP']  = projection['OBP']  || 0;
    formatted_projection['AVG']  = projection['AVG']  || 0;
    formatted_projection['KO']   = projection['SO']   || 0;
    formatted_projection['CS']   = projection['CS']   || 0;
    formatted_projection['OPS']  = projection['OPS']  || 0;
    formatted_projection['SLG']  = projection['SLG']  || 0;
    formatted_projection['XBH']  = (projection['2B'] + projection['3B']) || 0;
    formatted_projection['IP']   = projection['IP']   || 0;
    formatted_projection['K']    = projection['SO']   || 0;
    formatted_projection['W']    = projection['W']    || 0;
    formatted_projection['ERA']  = projection['ERA']  || 0;
    formatted_projection['WHIP'] = projection['WHIP'] || 0;
    formatted_projection['SV']   = projection['SV']   || 0;
    formatted_projection['HD']   = projection['HLD']  || 0;
    formatted_projection['SVHD'] = (projection['SV'] + projection['HLD']) || 0;
    formatted_projection['QS']   = projection['QS']   || 0;
    formatted_projection['BB']   = projection['BB']   || 0;
    formatted_projection['K/9']  = projection['K/9']  || 0;
    formatted_projection['K/BB'] = projection['K/BB'] || 0;
    formatted_projection['BS']   = projection['BS']   || 0;
    formatted_projection['HRA']  = projection['HRA']  || 0;

    // formatted_projection['HR/9'] = projection['HR/9'] || 0;
    // formatted_projection['CG']   = projection['CG']   || 0;
    // formatted_projection['SV%']  = projection['SV%']  || 0;
    // formatted_projection['IRS']  = projection['IRS']  || 0;
    return formatted_projection;
}

/** 
 * Update the KV store for our custom player objects
 */
async function storeCustomPlayers(players: Player[]) {
    for (const player of players) {
        kv.set(['players', parseInt(player.id)], player)
    }
}