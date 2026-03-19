import { useEffect, useRef } from 'react'
import useSWR from 'swr'
import {fetcher} from './fetcher'

function buildPlayerMap(players) {
    const playersMap = {}
    players.forEach(player => {
        playersMap[player.id] = player
    })
    return playersMap
}

function getInitialState() {
    const storedPlayers = localStorage.getItem('players')
    const storedTimestamp = localStorage.getItem('playersTimestamp')
    const dataAge = storedTimestamp ? Date.now() - parseInt(storedTimestamp) : Infinity
    const isStale = dataAge > 24 * 60 * 60 * 1000

    return {
        cachedPlayers: storedPlayers ? JSON.parse(storedPlayers) : null,
        isStale,
        shouldFetch: !storedPlayers || isStale,
    }
}

const usePlayers = () => {
    const initialState = useRef(getInitialState())
    const { cachedPlayers, isStale, shouldFetch } = initialState.current

    const { data, error, isLoading, mutate } = useSWR(shouldFetch ? `https://baseball-data.deno.dev/players` : null, fetcher)

    if (error) {
        throw new Error('Failed to fetch player data.')
    }

    const players = data ? buildPlayerMap(data.players) : cachedPlayers;

    // Save to localStorage when fresh data arrives
    useEffect(() => {
        if (data?.players?.length > 0) {
            console.log('Saving player data...')
            const mapped = buildPlayerMap(data.players)
            localStorage.setItem('players', JSON.stringify(mapped))
            localStorage.setItem('playersTimestamp', Date.now().toString())
        }
    }, [data])

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
