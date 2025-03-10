import useSWR from 'swr'
import {fetcher} from './fetcher'

const usePlayers = () => {
    let storedPlayers = localStorage.getItem('players')
    let shouldFetch = !storedPlayers
    const { data, error, isLoading } = useSWR(shouldFetch ? `https://baseball-data.deno.dev/players` : null, fetcher)

    if (error) {
        throw new Error('Failed to fetch player data.')
    }
    
    let players = data ? buildPlayerMap(data.players) : JSON.parse(storedPlayers);

    // @todo: The server should just return this format.
    function buildPlayerMap(players) {
        const playersMap = {}
        players.forEach(player => {
            playersMap[player.id] = player
        })
        return playersMap
    }

    // Save in local storage
    if (data?.players?.length > 0) {
        console.log('Saving player data...')
        localStorage.setItem('players', JSON.stringify(players))
    } 

    return {
        players,
        error,
        isLoading
    }
}

export default usePlayers