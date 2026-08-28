import { useEffect, useRef, useContext } from 'react'
import useSWR from 'swr'
import { SportContext } from './sportContext'
import { storageKey } from './config'

function buildPlayerMap(players) {
    const playersMap = {}
    players.forEach(player => {
        playersMap[player.id] = player
    })
    return playersMap
}

const usePlayers = () => {
    const { sport, config } = useContext(SportContext)

    // Each sport carries a cacheVersion so a change in the cached player shape
    // or bundled data (e.g. a refreshed football ECR snapshot) invalidates the
    // stale localStorage cache automatically.
    const version = config.data.cacheVersion || 'v1'
    const cacheKey = storageKey(sport, `players-${version}`)
    const timestampKey = storageKey(sport, `playersTimestamp-${version}`)

    const initialState = useRef(null)
    if (initialState.current === null) {
        const storedPlayers = localStorage.getItem(cacheKey)
        const storedTimestamp = localStorage.getItem(timestampKey)
        const dataAge = storedTimestamp ? Date.now() - parseInt(storedTimestamp) : Infinity
        const isStale = dataAge > 24 * 60 * 60 * 1000
        initialState.current = {
            cachedPlayers: storedPlayers ? JSON.parse(storedPlayers) : null,
            isStale,
            shouldFetch: !storedPlayers || isStale,
        }
    }
    const { cachedPlayers, isStale, shouldFetch } = initialState.current

    // Server-backed sports fetch a URL; client-only sports (football) fetch
    // directly from the source and return an array of players.
    const isServer = config.data.source === 'server'
    const swrKey = shouldFetch ? [`players`, sport] : null
    const swrFetcher = async () => {
        if (isServer) {
            const res = await fetch(config.data.playersUrl)
            const json = await res.json()
            return json.players
        }
        return config.data.fetchPlayers()
    }

    const { data, error, isLoading, mutate } = useSWR(swrKey, swrFetcher)

    if (error) {
        console.error('Failed to fetch player data:', error)
    }

    const players = data ? buildPlayerMap(data) : cachedPlayers

    useEffect(() => {
        if (data?.length > 0) {
            const mapped = buildPlayerMap(data)
            localStorage.setItem(cacheKey, JSON.stringify(mapped))
            localStorage.setItem(timestampKey, Date.now().toString())
        }
    }, [data, cacheKey, timestampKey])

    const refreshData = () => {
        localStorage.removeItem(cacheKey)
        localStorage.removeItem(timestampKey)
        return mutate()
    }

    return { players, error, isLoading, isStale, refreshData }
}

export default usePlayers
