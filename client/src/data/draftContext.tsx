import { createContext, useState, useContext } from 'react'
import { StoreContext } from './store'
import { statsToDisplay } from '~/features/filtering/columns'

export const DraftContext = createContext<any>({
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
    getLeagueAverages: () => {},
})

export const DraftProvider = ({ children }) => {
    const { players, teams } = useContext(StoreContext)
    
    // State for draft configuration
    const [myDraftSlot, setMyDraftSlot] = useState(null)
    const [totalTeams, setTotalTeams] = useState(10)
    const [totalRounds, setTotalRounds] = useState(26)
    const [currentPick, setCurrentPick] = useState(1)
    const [draftedPlayers, setDraftedPlayers] = useState<Record<string, any>>({})
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
        const totals: Record<string, any> = {};
        
        // Get unique stat categories from all players
        const allStatColumns = new Set<string>();
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
        
        // Track number of batters and pitchers
        let batterCount = 0;
        let pitcherCount = 0;
        
        // First pass to count batters and pitchers
        teamPlayerIds.forEach(playerId => {
            const player = players[playerId];
            if (!player) return;
            
            if (player.pos.includes('SP') || player.pos.includes('RP')) {
                pitcherCount++;
            } else {
                batterCount++;
            }
        });
        
        // Sum up projections for each player
        teamPlayerIds.forEach(playerId => {
            const player = players[playerId];
            if (!player || !player.projections) return;
            
            const isPitcher = player.pos.includes('SP') || player.pos.includes('RP');
            
            Object.entries(player.projections).forEach(([stat, value]: [string, any]) => {
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
                    } else if (['OBP', 'AVG', 'SLG', 'OPS'].includes(stat)) {
                        // Only add batting rate stats from non-pitchers, and just add the raw value
                        if (!isPitcher) {
                            totals[stat] += value;
                        }
                    } else if (stat === 'K') {
                        // Only add K stats from pitchers
                        if (isPitcher) {
                            totals[stat] += value;
                        }
                    } else {
                        totals[stat] += value;
                    }
                }
            });
        });
        
        // Calculate averages for batting rate stats
        if (batterCount > 0) {
            ['OBP', 'AVG', 'SLG', 'OPS'].forEach(stat => {
                if (totals[stat] !== undefined) {
                    totals[stat] = totals[stat] / batterCount;
                }
            });
        }
        
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

    // Function to get league averages excluding my team
    const getLeagueAverages = () => {
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
        getTeamStats,
        getLeagueAverages
    }
    
    return (
        <DraftContext.Provider value={contextValue}>
            {children}
        </DraftContext.Provider>
    )
}

export default DraftProvider