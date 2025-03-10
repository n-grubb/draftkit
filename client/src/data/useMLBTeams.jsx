import useSWR from 'swr'
import {fetcher} from './fetcher'

const useMLBTeams = () => {
    let storedTeams = localStorage.getItem('teams')
    let shouldFetch = !storedTeams
    const { data, error, isLoading } = useSWR(shouldFetch ? `https://baseball-data.deno.dev/teams` : null, fetcher)

    if (error) {
        throw new Error('Failed to fetch teams & divisions.')
    }
    
    let teams = data ? data.teams : JSON.parse(storedTeams);

    // Save in local storage
    if (data?.teams?.length > 0) {
        console.log('Saving mlb teams', { teams })
        localStorage.setItem('teams', JSON.stringify(teams))
    }

    return {
        teams,
        error,
        isLoading
    }
}

export default useMLBTeams