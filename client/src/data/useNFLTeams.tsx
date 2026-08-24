import useSWR from 'swr'
import {fetcher} from './fetcher'
import {API_URL} from './config'

const useNFLTeams = () => {
    const storedTeams = localStorage.getItem('teams')
    const shouldFetch = !storedTeams
    const { data, error, isLoading } = useSWR(shouldFetch ? `${API_URL}/teams` : null, fetcher)

    if (error) {
        throw new Error('Failed to fetch teams & divisions.')
    }

    const teams = data ? data.teams : JSON.parse(storedTeams);

    // Save in local storage
    if (data?.teams?.length > 0) {
        console.log('Saving NFL teams', { teams })
        localStorage.setItem('teams', JSON.stringify(teams))
    }

    return {
        teams,
        error,
        isLoading
    }
}

export default useNFLTeams
