import { useContext } from 'react'
import useSWR from 'swr'
import { SportContext } from './sportContext'
import { storageKey } from './config'

const useTeams = () => {
    const { sport, config } = useContext(SportContext)
    const cacheKey = storageKey(sport, 'teams')

    const storedTeams = localStorage.getItem(cacheKey)
    const shouldFetch = !storedTeams

    const isServer = config.data.source === 'server'
    const swrFetcher = async () => {
        if (isServer) {
            const res = await fetch(config.data.teamsUrl)
            const json = await res.json()
            return json.teams
        }
        return config.data.fetchTeams()
    }

    const { data, error, isLoading } = useSWR(shouldFetch ? ['teams', sport] : null, swrFetcher)

    if (error) {
        console.error('Failed to fetch teams:', error)
    }

    const teams = data ? data : (storedTeams ? JSON.parse(storedTeams) : [])

    if (data?.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify(teams))
    }

    return { teams, error, isLoading }
}

export default useTeams
