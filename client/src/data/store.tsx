import { createContext, useState, useMemo, useCallback, useContext } from 'react';
import { SportContext } from './sportContext'
import useTeams from './useTeams'
import usePlayers from './usePlayers'
import useUserRanking from './useUserRanking'

/**
 * Create a global store context that all components can access.
 * The values here are retrieved from localStorage when the app starts. 
 */
export const StoreContext = createContext<any>({})

export const StoreProvider = ({ children }) => {
    const { config } = useContext(SportContext)
    const initialMode = localStorage.getItem('mode') || 'view'
    const [mode, setMode] = useState(initialMode)
    const updateMode = useCallback((modeSelection) => {
        setMode(modeSelection)
        localStorage.setItem('mode', modeSelection)
    }, [])

    const { teams, error: errorFetchingTeams, isLoading: isLoadingTeams } = useTeams()
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

    const error = errorFetchingTeams || errorFetchingPlayers
    const isLoading = isLoadingTeams || isLoadingPlayers || isLoadingRanking

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
                <p className="error">Error retrieving {config.shortLabel} source data.</p>
                {config.data.source === 'espn-direct' && (
                    <p className="error-detail">
                        Couldn’t load live data from ESPN. This can happen if ESPN is
                        unreachable or blocks the browser request.
                    </p>
                )}
            </div>
        )
    }
    if (isLoading) {
        return (
            <div className="centered">
                <p>{config.loadingText}</p>
            </div>
        )
    }

    return(
        <StoreContext.Provider value={context}>
            { children }
        </StoreContext.Provider>
    ) 
}