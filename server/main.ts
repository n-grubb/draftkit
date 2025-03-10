import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";

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
    team_id: number, 
    pos: string[],
    stats: Record<string, any>,
    projections: Record<string, any> | null,
    headshot: string,
    ownership: number
}

interface Ranking {}

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
 * Returns a specific user ranking by id as JSON
 */
app.get('/ranking/:id', (c) => {
    const id = c.req.param('id');    
});

/**
 * Update/create a ranking
 * Each ranking will have an ID and a pin number that acts as the admin password. 
 */
app.post('/ranking:id', (c) => {
    const id = c.req.param('id');  
    c.json({});
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
    const VALID_SOURCES = ['teams', 'players', 'stats', 'projections'];
    const sources_to_update = ['stats'];

    // Validate sources_to_update
    if (sources_to_update.length < 1) {
        return c.text('No sources were updated.')
    }
    if (sources_to_update.some(source_id => !VALID_SOURCES.includes(source_id))) {
        return c.text('Invalid data source.', 503);
    }

    let teams: Team[] = [];
    let divisions: Division[] = []; 
    if (sources_to_update.includes('teams')) {
        const {teams: fetchedTeams, divisions: fetchedDivisions} = await fetchTeamsAndDivisions();
        teams     = fetchedTeams;
        divisions = fetchedDivisions;
        storeTeamsAndDivisions(teams, divisions);
        console.log('teams & divisions refreshed.')
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
    console.log(`teams found: ${teams.length}`);
    console.log(`divisions found: ${divisions.length}`);

    let playerlist = [];
    if (sources_to_update.includes('players')) {
        playerlist = await fetchMLBPlayerList();
        storePlayerList(playerlist);
        console.log('players refreshed.');
    } else {
        let entries = kv.list({ prefix: ['playerlist']});
        for await (let player of entries) {
            playerlist.push(player.value);
        }
    }
    console.log(`players found: ${playerlist.length}`);

    let stats = {};
    if (sources_to_update.includes('stats')) {
        stats = await fetchPlayerStats();
        storePlayerStats(stats);
        console.log('player stats refreshed.');
    } else {
        let entries = kv.list({ prefix: ['stats']});
        for await (let entry of entries) {
            stats[entry.key[1]] = entry.value;
        }
    }
    console.log(`stats found for players: ${Object.keys(stats).length}`);

    let projections = {};
    if (sources_to_update.includes('projections')) {
        let all_projections = await fetchFangraphProjections();
        projections = await buildAndStorePlayerProjections(all_projections, playerlist);
    } else {
        let entries = kv.list({ prefix: ['projections']});
        for await (let entry of entries) {
            projections[entry.key[1]] = entry.value;
        }
    }
    console.log(`Projections found: ${Object.keys(projections).length}`);

    // Our custom player store is built from all of the above data sources. 
    // If any of them have been refreshed, we rebuild the player data. 
    const players = await buildCustomPlayerStore(
        teams, 
        divisions, 
        playerlist,
        stats, 
        projections
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
 */
async function fetchPlayerStats() {
    const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/flb/seasons/2025/segments/0/leagues/3850?view=kona_player_info`;
    let response = await fetch(url, {
        headers: {
            'x-fantasy-filter': '{"players":{"filterSlotIds":{"value":[0,1,2,3,4,5,6,7,8,9,10,11,12,17]},"filterRanksForScoringPeriodIds":{"value":[162]},"sortPercOwned":{"sortPriority":1,"sortAsc":false},"limit":500}}'
        } 
    });
    if (!response.ok) {
        throw new Error('Failed to fetch batter stats.', {response});
    }
    let batter_stats = await response.json();

    response = await fetch(url, {
        headers: {
            'x-fantasy-filter': '{"players":{"filterSlotIds":{"value":[13,14,15,17]},"filterRanksForScoringPeriodIds":{"value":[162]},"sortPercOwned":{"sortPriority":1,"sortAsc":false},"limit":400}}'
        } 
    });
    if (!response.ok) {
        throw new Error('Failed to fetch pitcher stats.', {response});
    }
    let pitcher_stats = await response.json();

    // Store stats by player id for more efficient lookup later. 
    let stats = {};
    batter_stats.players.forEach(batter => {
        if (batter.id == 33192) {
            console.log(batter)
        } 
        
        stats[batter.id] = batter.player.stats
    })
    pitcher_stats.players.forEach(pitcher => {
        stats[pitcher.id] = pitcher.player.stats
    })

    return stats;
}

/** 
 * Update the KV store of player stats
 */
function storePlayerStats(stats: any[]) {
    for (const [playerId, playerStats] of Object.entries(stats)) {
        kv.set(['stats', parseInt(playerId)], playerStats)
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
function buildAndStorePlayerProjections(projections: any[], playerlist: ESPNPlayer[]) {
    const [batting_projections, pitching_projections] = projections;

    const player_projections = {}
    playerlist.forEach(player => {     
        let projection = {};
        
        if (isBatter(player)) {
            let batting = batting_projections.find(b => replaceAccentedCharacters(b.PlayerName) == replaceAccentedCharacters(player.fullName));
            // TODO: Add an additional qualifier in case players have the same name. 
            if (batting) {
                projection = {
                    ...batting,
                    'bBB': batting['BB'],
                    'KO': batting['SO'],
                };
            }
        }

        if (isPitcher(player)) {
            let pitching = pitching_projections.find(p => replaceAccentedCharacters(p.PlayerName) == replaceAccentedCharacters(player.fullName));
            if (pitching) {
                projection = {
                    ...projection,
                    ...pitching,
                    ['HR']: projection.HR,
                    ['HRA']: pitching.HR
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
 * Create a player object in a shape that makes it easy to
 * sort & display info on the client.  
 */
async function buildCustomPlayerStore(
    teams: Team[], 
    divisions: Division[], 
    playerlist: ESPNPlayer[], 
    stats: any[], 
    projections: any[]
) {
    const players: Player[] = playerlist.map(player => {
        return { 
            id: player.id,
            name: player.fullName,
            team_id: player.proTeamId, 
            pos: formatPositionEligibility(player.eligibleSlots),
            stats: formatPlayerStats(stats[player.id]),
            projections: formatProjections(projections[player.id]),
            headshot: `https://a.espncdn.com/combiner/i?img=/i/headshots/mlb/players/full/${player.id}.png?w=96&h=70&cb=1`,
            ownership: player?.ownership?.percentOwned || 0,
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

function formatPlayerStats(stats) {
    const stats_2023 = stats?.find(ps => ps.id == "002023")?.stats;
    const stats_2024 = stats?.find(ps => ps.id == "002024")?.stats;

    let player_stats = {};
    if (stats_2023) {
        player_stats[2023] = getApplicableStats(stats_2023);
    }
    if (stats_2024) {
        player_stats[2024] = getApplicableStats(stats_2024);
    }
    
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
    formatted_projection['SVHD'] = (projection['SV'] + projection['HD']) || 0;
    formatted_projection['HD']   = projection['HD']   || 0;
    formatted_projection['SV']   = projection['SV']   || 0;
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