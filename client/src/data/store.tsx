import { createContext, useState } from 'react';
import useMLBTeams from './useMLBTeams'
import usePlayers from './usePlayers'
import useUserRanking from './useUserRanking'

/**
 * Create a global store context that all components can access.
 * The values here are retrieved from localStorage when the app starts. 
 */
export const StoreContext = createContext<any>({})

export const StoreProvider = ({ children }) => {
    let initialMode = localStorage.getItem('mode') || 'view'
    const [mode, setMode] = useState(initialMode)
    function updateMode(modeSelection) {
        setMode(modeSelection)
        localStorage.setItem('mode', modeSelection)
    }
    
    const { teams, error: errorFetchingMLBTeams, isLoading: isLoadingMLBTeams } = useMLBTeams()
    const { players, error: errorFetchingPlayers, isLoading: isLoadingPlayers } = usePlayers()

    // Use the enhanced user ranking hook that supports sharing
    const userRanking = useUserRanking(players)
    const {
        ranking,
        isLoading: isLoadingRanking,
        updateRanking,
        ignorePlayer,
        highlightPlayer,
        updatePlayerNote
    } = userRanking

    const error = errorFetchingMLBTeams || errorFetchingPlayers
    const isLoading = isLoadingMLBTeams || isLoadingPlayers || isLoadingRanking

    const context = {
        teams,
        players,
        mode,
        ranking,
        updateMode,
        updateRanking,
        ignorePlayer,
        highlightPlayer,
        updatePlayerNote,
        userRanking // Expose the full userRanking object for sharing functionality
    }

    if (error) {
        return (
            <div className="centered">
                <p className="error">Error retrieving source data.</p>
            </div>
        )
    }
    if (isLoading) {
        return (
            <div className="centered">
                <p>Loading MLB players and teams...</p>
            </div>
        )
    }

    return(
        <StoreContext.Provider value={context}>
            { children }
        </StoreContext.Provider>
    ) 
}