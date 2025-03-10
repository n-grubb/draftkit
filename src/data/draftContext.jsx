import { createContext, useState, useContext } from 'react'
import { StoreContext } from './store'
import { statsToDisplay } from '~/features/filtering/columns'

export const DraftContext = createContext({
    myDraftSlot: null,
    totalTeams: 10,
    totalRounds: 26,
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
})

export const DraftProvider = ({ children }) => {
    const { players, teams } = useContext(StoreContext)
    
    // State for draft configuration
    const [myDraftSlot, setMyDraftSlot] = useState(null)
    const [totalTeams, setTotalTeams] = useState(10)
    const [totalRounds, setTotalRounds] = useState(26)
    const [currentPick, setCurrentPick] = useState(1)
    const [draftedPlayers, setDraftedPlayers] = useState({})
    const [showDraftSettings, setShowDraftSettings] = useState(true)
    
    // Calculate whose turn it is based on the current pick
    const getCurrentTeam = (pick) => {
        const round = Math.ceil(pick / totalTeams)
        const isEvenRound = round % 2 === 0
        
        if (isEvenRound) {
            // Even rounds go in reverse order (10, 9, 8, ...)
            return totalTeams - ((pick - 1) % totalTeams)
        } else {
            // Odd rounds go in forward order (1, 2, 3, ...)
            return ((pick - 1) % totalTeams) + 1
        }
    }
    
    // Check if it's my turn to draft
    const isMyTurn = () => {
        return myDraftSlot && getCurrentTeam(currentPick) === myDraftSlot
    }
    
    // Handle when a team drafts a player
    const draftPlayer = (playerId) => {
        const newDraftedPlayers = {
            ...draftedPlayers,
            [currentPick]: playerId
        }
        
        setDraftedPlayers(newDraftedPlayers)
        setCurrentPick(currentPick + 1)
    }
    
    // Function to restart the draft
    const restartDraft = () => {
        setCurrentPick(1);
        setDraftedPlayers({});
    }
    
    // Function to get stats for a specific team
    const getTeamStats = (teamNumber) => {
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
        
        // Initialize totals object with all potential stats
        const totals = {};
        
        // Get unique stat categories from all players
        const allStatColumns = new Set();
        teamPlayerIds.forEach(playerId => {
            const player = players[playerId];
            if (!player) return;
            
            const columns = statsToDisplay(player.pos);
            columns.forEach(col => allStatColumns.add(col.id));
        });
        
        // Initialize totals for all potential stats
        [...allStatColumns].forEach(stat => {
            totals[stat] = 0;
        });
        
        // Sum up projections for each player
        teamPlayerIds.forEach(playerId => {
            const player = players[playerId];
            if (!player || !player.projections) return;
            
            Object.entries(player.projections).forEach(([stat, value]) => {
                if (totals[stat] !== undefined && value) {
                    // For ERA and WHIP, we need weighted averages based on IP
                    if (stat === 'ERA' || stat === 'WHIP') {
                        if (player.projections.IP) {
                            // Store value * IP for weighted average calculation later
                            totals[stat] += value * player.projections.IP;
                            
                            // Store IP separately for each stat if not already done
                            if (!totals[`${stat}_IP`]) {
                                totals[`${stat}_IP`] = 0;
                            }
                            totals[`${stat}_IP`] += player.projections.IP;
                        }
                    } else {
                        totals[stat] += value;
                    }
                }
            });
        });
        
        // Calculate weighted averages for ERA and WHIP
        if (totals.ERA && totals.ERA_IP) {
            totals.ERA = totals.ERA / totals.ERA_IP;
            delete totals.ERA_IP;
        }
        
        if (totals.WHIP && totals.WHIP_IP) {
            totals.WHIP = totals.WHIP / totals.WHIP_IP;
            delete totals.WHIP_IP;
        }
        
        return totals;
    };

    // Exposed context value
    const contextValue = {
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
        getTeamStats
    }
    
    return (
        <DraftContext.Provider value={contextValue}>
            {children}
        </DraftContext.Provider>
    )
}

export default DraftProvider