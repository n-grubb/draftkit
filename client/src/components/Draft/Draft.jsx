import { useContext } from 'react'
import { StoreContext } from '~/data/store'
import { DraftContext } from '~/data/draftContext'
import PlayerList from '../PlayerList/PlayerList'
import TeamRadarChart from './TeamRadarChart'
import StartersRemaining from './StartersRemaining'

const Draft = () => {
    const { players, teams } = useContext(StoreContext)
    const { 
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
        restartDraft
    } = useContext(DraftContext)
    
    
    // Generate the draft board grid
    const renderDraftBoard = () => {
        const grid = []
        
        // Create header row with team numbers
        const headerRow = [<div key="header-empty" className="draft-cell header empty"></div>]
        for (let team = 1; team <= totalTeams; team++) {
            const isMyTeam = team === myDraftSlot
            headerRow.push(
                <div 
                    key={`header-${team}`} 
                    className={`draft-cell header ${isMyTeam ? 'my-team' : ''}`}
                >
                    {team}
                </div>
            )
        }
        grid.push(<div key="header-row" className="draft-row header">{headerRow}</div>)
        
        // Create each round row
        for (let round = 1; round <= totalRounds; round++) {
            const isEvenRound = round % 2 === 0
            const cells = [
                <div key={`round-${round}`} className="draft-cell round-header">
                    Round {round}
                </div>
            ]
            
            // Create each cell in the row
            for (let team = 1; team <= totalTeams; team++) {
                // Calculate the pick number based on round and team
                const teamInOrder = isEvenRound ? (totalTeams - team + 1) : team
                const pickNumber = (round - 1) * totalTeams + teamInOrder
                
                // Check if this pick has already been made
                const pickedPlayerId = draftedPlayers[pickNumber]
                const isCurrentPick = pickNumber === currentPick
                const isMyTeamPick = team === myDraftSlot
                
                let cellContent = null
                if (pickedPlayerId) {
                    const player = players[pickedPlayerId]
                    const team = teams[player.team_id]
                    // Get primary position for border color
                    const primaryPosition = player.pos[0]
                    
                    cellContent = (
                        <div 
                            className="drafted-player"
                            data-primary-pos={primaryPosition}
                        >
                            <img 
                                className="mini-headshot" 
                                src={player.headshot.replace('w=96', 'w=426').replace('h=70', 'h=320')} 
                                alt={player.name} 
                            />
                            <div className="picked-player-name">{player.name}</div>
                            <span className="player-pos-indicator">{primaryPosition}</span>
                        </div>
                    )
                }
                
                cells.push(
                    <div 
                        key={`cell-${round}-${team}`} 
                        className={`draft-cell ${isCurrentPick ? 'current' : ''} ${isMyTeamPick ? 'my-team' : ''}`}
                        data-pick={pickNumber}
                    >
                        {cellContent}
                    </div>
                )
            }
            
            grid.push(<div key={`round-${round}-row`} className="draft-row">{cells}</div>)
        }
        
        return <div className="draft-board">{grid}</div>
    }
    
    // Draft settings component
    const renderDraftSettings = () => {
        if (!showDraftSettings) return null
        
        return (
            <div className="draft-settings-overlay">
                <div className="draft-settings">
                    <h2>Draft Settings</h2>
                    
                    <div className="setting-group">
                        <label htmlFor="total-teams">Number of Teams:</label>
                        <select 
                            id="total-teams" 
                            value={totalTeams} 
                            onChange={(e) => setTotalTeams(Number(e.target.value))}
                        >
                            {[8, 10, 12, 14, 16].map(num => (
                                <option key={num} value={num}>{num}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="setting-group">
                        <label htmlFor="total-rounds">Number of Rounds:</label>
                        <select 
                            id="total-rounds" 
                            value={totalRounds} 
                            onChange={(e) => setTotalRounds(Number(e.target.value))}
                        >
                            {[20, 22, 24, 26, 28, 30].map(num => (
                                <option key={num} value={num}>{num}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="setting-group">
                        <label htmlFor="draft-slot">Your Draft Slot:</label>
                        <div className="slot-options">
                            {Array.from({ length: totalTeams }, (_, i) => i + 1).map(slot => (
                                <button 
                                    key={slot} 
                                    className={`slot-option ${myDraftSlot === slot ? 'selected' : ''}`}
                                    onClick={() => setMyDraftSlot(slot)}
                                >
                                    {slot}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="draft-settings-buttons">
                        <button 
                            className="cancel-button"
                            onClick={() => setShowDraftSettings(false)}
                        >
                            Close
                        </button>
                        <button 
                            className="start-draft-button"
                            onClick={() => {
                                if (myDraftSlot) {
                                    setShowDraftSettings(false)
                                    // Restart the draft if applying new settings
                                    restartDraft()
                                } else {
                                    alert("Please select your draft slot")
                                }
                            }}
                            disabled={!myDraftSlot}
                        >
                            Apply Settings
                        </button>
                    </div>
                </div>
            </div>
        )
    }
    
    return (
        <div className="draft-mode">
            {renderDraftSettings()}
            
            <div className="draft-header">
                <h2>Draft Board</h2>
                <div className="draft-controls">
                    <div className="current-pick">
                        <span>Pick: {currentPick}</span>
                        <span>Team: {getCurrentTeam(currentPick)}</span>
                        {isMyTurn() && <span className="my-turn">Your Pick!</span>}
                    </div>
                    <button onClick={() => setShowDraftSettings(true)}>Draft Settings</button>
                </div>
            </div>
            
            <div className="draft-container">
                <div className="draft-board-container">
                    {renderDraftBoard()}
                    
                    {/* Add TeamRadarChart and StartersRemaining */}
                    <div className="draft-insights">
                        {myDraftSlot && (
                            <div className="team-stats-container">
                                <TeamRadarChart />
                            </div>
                        )}
                    </div>
                </div>
                <div className="draft-player-list">

                    <div className="starters-tracker">
                        <StartersRemaining />
                    </div>

                    <PlayerList 
                        editable={false} 
                        draftMode={true}
                        isMyTurn={isMyTurn()}
                        draftPlayer={draftPlayer}
                        draftedPlayerIds={Object.values(draftedPlayers)}
                    />
                </div>
            </div>
        </div>
    )
}

export default Draft