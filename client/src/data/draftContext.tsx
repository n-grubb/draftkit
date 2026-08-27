import { createContext, useState, useContext, useMemo, useCallback } from 'react'
import { StoreContext } from './store'
import { SportContext } from './sportContext'

export const DraftContext = createContext<any>({
    myDraftSlot: null,
    totalTeams: 10,
    totalRounds: 16,
    currentPick: 1,
    draftedPlayers: {},
    showDraftSettings: true,
    getCurrentTeam: () => {},
    isMyTurn: () => {},
    draftPlayer: () => {},
    setMyDraftSlot: () => {},
    setTotalTeams: () => {},
    setTotalRounds: () => {},
    setShowDraftSettings: () => {},
    getTeamStats: () => {},
    getLeagueAverages: () => {},
})

export const DraftProvider = ({ children }) => {
    const { players } = useContext(StoreContext)
    const { config } = useContext(SportContext)

    // State for draft configuration
    const [myDraftSlot, setMyDraftSlot] = useState(null)
    const [totalTeams, setTotalTeams] = useState(config.draft.defaultTeams)
    const [totalRounds, setTotalRounds] = useState(config.draft.defaultRounds)
    const [currentPick, setCurrentPick] = useState(1)
    const [draftedPlayers, setDraftedPlayers] = useState<Record<string, any>>({})
    const [showDraftSettings, setShowDraftSettings] = useState(true)
    
    // Calculate whose turn it is based on the current pick
    const getCurrentTeam = useCallback((pick) => {
        const round = Math.ceil(pick / totalTeams)
        const isEvenRound = round % 2 === 0
        
        if (isEvenRound) {
            // Even rounds go in reverse order (10, 9, 8, ...)
            return totalTeams - ((pick - 1) % totalTeams)
        } else {
            // Odd rounds go in forward order (1, 2, 3, ...)
            return ((pick - 1) % totalTeams) + 1
        }
    }, [totalTeams])
    
    // Check if it's my turn to draft
    const isMyTurn = useCallback(() => {
        return myDraftSlot && getCurrentTeam(currentPick) === myDraftSlot
    }, [myDraftSlot, currentPick, getCurrentTeam])
    
    // Handle when a team drafts a player
    const draftPlayer = useCallback((playerId) => {
        const newDraftedPlayers = {
            ...draftedPlayers,
            [currentPick]: playerId
        }
        
        setDraftedPlayers(newDraftedPlayers)
        setCurrentPick(currentPick + 1)
    }, [draftedPlayers, currentPick])
    
    // Function to restart the draft
    const restartDraft = useCallback(() => {
        setCurrentPick(1);
        setDraftedPlayers({});
    }, [])
    
    // Function to get stats for a specific team
    const getTeamStats = useCallback((teamNumber) => {
        if (!teamNumber) return null;
        
        // Find all pick numbers that belong to this team
        const teamPicks = [];
        for (let round = 1; round <= totalRounds; round++) {
            const isEvenRound = round % 2 === 0;
            // Calculate pick number based on snake draft order
            const teamInOrder = isEvenRound ? (totalTeams - teamNumber + 1) : teamNumber;
            const pickNumber = (round - 1) * totalTeams + teamInOrder;
            teamPicks.push(pickNumber);
        }
        
        // Get player IDs drafted by this team
        const teamPlayerIds = teamPicks
            .filter(pick => draftedPlayers[pick])
            .map(pick => draftedPlayers[pick]);
        
        if (teamPlayerIds.length === 0) return null;

        // Each sport defines how team totals are aggregated from projections.
        return config.draft.aggregateTeamStats(players, teamPlayerIds);
    }, [draftedPlayers, players, totalTeams, totalRounds, config]);

    // Function to get league averages excluding my team
    const getLeagueAverages = useCallback(() => {
        if (!myDraftSlot) return null;

        let leagueStats: Record<string, any> = {};
        let teamsWithStats = 0;

        // Calculate stats for each team except mine
        for (let team = 1; team <= totalTeams; team++) {
            if (team === myDraftSlot) continue;
            
            const teamStats = getTeamStats(team);
            if (!teamStats) continue;

            teamsWithStats++;
            
            // Add each team's stats to the league totals
            Object.entries(teamStats).forEach(([stat, value]) => {
                if (!leagueStats[stat]) {
                    leagueStats[stat] = 0;
                }
                leagueStats[stat] += value;
            });
        }

        // If no other teams have stats, return null
        if (teamsWithStats === 0) return null;

        // Calculate averages
        Object.keys(leagueStats).forEach(stat => {
            leagueStats[stat] = leagueStats[stat] / teamsWithStats;
        });

        return leagueStats;
    }, [myDraftSlot, totalTeams, getTeamStats]);

    // Exposed context value
    const contextValue = useMemo(() => ({
        myDraftSlot,
        totalTeams,
        totalRounds,
        currentPick,
        draftedPlayers,
        showDraftSettings,
        getCurrentTeam,
        isMyTurn,
        draftPlayer,
        setMyDraftSlot,
        setTotalTeams,
        setTotalRounds,
        setShowDraftSettings,
        restartDraft,
        getTeamStats,
        getLeagueAverages
    }), [myDraftSlot, totalTeams, totalRounds, currentPick, draftedPlayers, showDraftSettings, getCurrentTeam, isMyTurn, draftPlayer, restartDraft, getTeamStats, getLeagueAverages])
    
    return (
        <DraftContext.Provider value={contextValue}>
            {children}
        </DraftContext.Provider>
    )
}

export default DraftProvider