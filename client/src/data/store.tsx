import { createContext, useState, useMemo, useCallback, useContext } from 'react';
import { SportContext } from './sportContext'
import SportSelector from '~/components/SportSelector'
import useTeams from './useTeams'
import usePlayers from './usePlayers'
import useUserRanking from './useUserRanking'

// A minimal shell shown during loading / on data errors. It keeps the sport
// toggle available so a failure loading one sport's data never traps the user
// (they can still switch to the other sport, which reloads from scratch).
function StatusShell({ children }) {
    return (
        <div id="app" className="mode--view">
            <header data-component="AppHeader">
                <div className="header-left">
                    <h1>draftkit</h1>
                    <SportSelector />
                </div>
            </header>
            <main>
                <div className="centered">{children}</div>
            </main>
        </div>
    )
}

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
            <StatusShell>
                <p className="error">Couldn’t load {config.shortLabel} data.</p>
                <p className="error-detail">
                    {config.data.source === 'espn-direct'
                        ? 'The browser couldn’t load live data from ESPN — it may be unreachable or blocking the request. Try the other sport with the toggle above.'
                        : 'The data server couldn’t be reached. Try the other sport with the toggle above.'}
                </p>
            </StatusShell>
        )
    }
    if (isLoading) {
        return (
            <StatusShell>
                <p>{config.loadingText}</p>
            </StatusShell>
        )
    }

    return(
        <StoreContext.Provider value={context}>
            { children }
        </StoreContext.Provider>
    ) 
}