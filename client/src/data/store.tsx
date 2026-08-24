import { createContext, useState, useMemo, useCallback } from 'react';
import useNFLTeams from './useNFLTeams'
import usePlayers from './usePlayers'
import useUserRanking from './useUserRanking'

/**
 * Create a global store context that all components can access.
 * The values here are retrieved from localStorage when the app starts. 
 */
export const StoreContext = createContext<any>({})

export const StoreProvider = ({ children }) => {
    const initialMode = localStorage.getItem('mode') || 'view'
    const [mode, setMode] = useState(initialMode)
    const updateMode = useCallback((modeSelection) => {
        setMode(modeSelection)
        localStorage.setItem('mode', modeSelection)
    }, [])
    
    const { teams, error: errorFetchingNFLTeams, isLoading: isLoadingNFLTeams } = useNFLTeams()
    const { players, error: errorFetchingPlayers, isLoading: isLoadingPlayers } = usePlayers()

    // Use the enhanced user ranking hook that supports sharing
    const userRanking = useUserRanking(players)
    const {
        ranking,
        isLoading: isLoadingRanking,
        updateRanking,
        ignorePlayer,
        highlightPlayer,
        updatePlayerNote,
        updatePlayerProjection,
        toggleCustomProjections
    } = userRanking

    const error = errorFetchingNFLTeams || errorFetchingPlayers
    const isLoading = isLoadingNFLTeams || isLoadingPlayers || isLoadingRanking

    const context = useMemo(() => ({
        teams,
        players,
        mode,
        ranking,
        updateMode,
        updateRanking,
        ignorePlayer,
        highlightPlayer,
        updatePlayerNote,
        updatePlayerProjection,
        toggleCustomProjections,
        userRanking // Expose the full userRanking object for sharing functionality
    }), [teams, players, mode, ranking, updateMode, updateRanking, ignorePlayer, highlightPlayer, updatePlayerNote, updatePlayerProjection, toggleCustomProjections, userRanking])

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
                <p>Loading NFL players and teams...</p>
            </div>
        )
    }

    return(
        <StoreContext.Provider value={context}>
            { children }
        </StoreContext.Provider>
    ) 
}