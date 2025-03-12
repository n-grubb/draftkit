import useSWR from 'swr'
import {fetcher} from './fetcher'

const usePlayers = () => {
    let storedPlayers = localStorage.getItem('players')
    let storedTimestamp = localStorage.getItem('playersTimestamp')
    let currentTime = Date.now()
    let dataAge = storedTimestamp ? currentTime - parseInt(storedTimestamp) : Infinity
    let isStale = dataAge > 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    let shouldFetch = !storedPlayers || isStale

    const { data, error, isLoading, mutate } = useSWR(shouldFetch ? `https://baseball-data.deno.dev/players` : null, fetcher)

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

    // Save in local storage with timestamp
    if (data?.players?.length > 0) {
        console.log('Saving player data...')
        localStorage.setItem('players', JSON.stringify(players))
        localStorage.setItem('playersTimestamp', currentTime.toString())
    } 

    const refreshData = () => {
        localStorage.removeItem('players')
        localStorage.removeItem('playersTimestamp')
        return mutate()
    }

    return {
        players,
        error,
        isLoading,
        isStale,
        refreshData
    }
}

export default usePlayers