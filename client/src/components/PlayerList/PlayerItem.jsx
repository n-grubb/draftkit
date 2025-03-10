import {useContext} from 'react'
import {StoreContext} from '~/data/store'
import {DraftContext} from '~/data/draftContext'
import {StatsPrefsContext} from '~/data/statsPrefsContext'
import {statsToDisplay} from '~/features/filtering/columns'
import {formatStatValue} from '~/features/stats'

const EXLUDED_POSITIONS = ['1B/3B', '2B/SS', 'P', 'UTIL']

const PlayerItem = (props) => {
    const {playerId, playerRanking, editable, onNameClick} = props
    const {players, teams, mode, ignorePlayer, highlightPlayer} = useContext(StoreContext);
    const {isMyTurn, draftPlayer} = useContext(DraftContext);
    const {selectedBattingStats, selectedPitchingStats} = useContext(StatsPrefsContext);
    
    const isDraftMode = mode === 'draft';
    
    const player = players[playerId]
    const projections = player.projections

    // Don't show specialty roster spots as POS
    let positions = player.pos.filter(position => !EXLUDED_POSITIONS.includes(position))
    if (positions.length > 1) {
        positions = positions.filter(position => position != 'DH')
    }

    const renderCellValue = (player, columnId) => {
        if (player[columnId]) {
            return player[columnId]
        }
        if (projections && projections[columnId]) {
            return formatStatValue(columnId, projections[columnId])
        }
        return 0 
    }

    const teamLogo = teams[player.team_id].logo?.href
    
    // Use custom stats in view/edit mode, default in draft mode
    const columns = isDraftMode 
        ? statsToDisplay(player.pos) 
        : statsToDisplay(player.pos, selectedBattingStats, selectedPitchingStats);
    
    const onHighlight = () => {
        console.log('running highlight action...', playerId)
        highlightPlayer(playerId)
    }

    const onIgnore = () => {
        ignorePlayer(playerId)
    }
    
    const onDraft = () => {
        draftPlayer(playerId)
    }

    const className = `player-item ${playerRanking?.highlight ? 'highlighted' : playerRanking?.ignore ? 'ignored' : ''}`

    return (
        <div className={className}>
            <div className="player-photos">
                { teamLogo && (<img className="team-logo" src={teamLogo} width="32" />) }
                <img className="player-headshot" src={player.headshot.replace('w=96', 'w=426').replace('h=70', 'h=320')} width="96" /> 
            </div>
            <div className="player-details">
                <p className="player-name" onClick={onNameClick}>{player.name}</p>
                <div className="player-positions small">
                    {positions.map(position => (
                        <span 
                            key={position} 
                            className="position-chip small"
                            data-pos={position}
                        >{position}</span>
                    ))}
                </div>
            </div>
            <div className="player-stats">
                <table>
                    <thead>
                        <tr>
                            { columns.map(column => (<th key={column.id}>{column.name}</th>))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>                            
                            { columns.map(column => (<td key={column.id}>{renderCellValue(player, column.id)}</td>))}
                        </tr>
                    </tbody>
                </table>
            </div>
            {editable && !isDraftMode && (
                <div className="player-actions">
                    <button 
                        onClick={onIgnore}
                        className={playerRanking?.ignore ? 'ignored' : ''}
                    >
                        {playerRanking?.ignore ? 'unignore' : 'ignore'}
                    </button>
                    <button 
                        onClick={onHighlight}
                        className={playerRanking?.highlight ? 'highlighted' : ''}
                    >
                        {playerRanking?.highlight ? 'unhighlight' : 'highlight'}
                    </button>
                </div>
            )}
            
            {isDraftMode && (
                <div className="player-actions">
                    {isMyTurn() ? (
                        <button 
                            onClick={onDraft}
                            className="draft-button"
                        >
                            Draft
                        </button>
                    ) : (
                        <button 
                            onClick={onDraft}
                            className="drafted-button"
                        >
                            Drafted
                        </button>
                    )}
                </div>
            )}
           
        </div>
    )
}

export default PlayerItem
