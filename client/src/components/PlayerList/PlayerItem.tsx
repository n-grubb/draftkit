import {useContext, useState} from 'react'
import {StoreContext} from '~/data/store'
import {DraftContext} from '~/data/draftContext'
import {StatsPrefsContext} from '~/data/statsPrefsContext'
import {statsToDisplay} from '~/features/filtering/columns'
import {formatStatValue, evaluateStatQuality} from '~/features/stats'

const EXLUDED_POSITIONS = ['1B/3B', '2B/SS', 'P', 'UTIL']

const PlayerItem = (props) => {
    const {playerId, playerRanking, editable, onNameClick} = props
    const {players, teams, mode, ignorePlayer, highlightPlayer, updatePlayerNote, userRanking} = useContext(StoreContext);
    const {isMyTurn, draftPlayer} = useContext(DraftContext);
    const {selectedBattingStats, selectedPitchingStats} = useContext(StatsPrefsContext);
    
    const isDraftMode = mode === 'draft';

    // Notes are editable when in edit mode and the ranking is yours (local, or shared with PIN)
    const notesEditable = editable && (!userRanking?.isShared || !!userRanking?.pin);
    const [noteText, setNoteText] = useState(playerRanking?.note || '');

    const player = players[playerId]
    const projections = player.projections

    // Don't show specialty roster spots as POS
    let positions = player.pos.filter(position => !EXLUDED_POSITIONS.includes(position))
    if (positions.length > 1 && !positions.includes('SP')) {
        positions = positions.filter(position => position != 'DH')
    }

    const renderCellValue = (player, columnId) => {
        let value = null;
        if (player[columnId]) {
            value = player[columnId];
        } else if (projections && projections[columnId]) {
            value = projections[columnId];
        } else {
            return 0;
        }

        // Get the primary position for pitchers (SP vs RP)
        let primaryPosition = null;
        if (player.pos.includes('SP')) {
            primaryPosition = 'SP';
        } else if (player.pos.includes('RP')) {
            primaryPosition = 'RP';
        }

        // Get the quality class for styling
        const quality = evaluateStatQuality(columnId, value, primaryPosition);
        const formattedValue = formatStatValue(columnId, value);
        
        // Only apply highlighting for elite, good, and average - not for below-average
        const className = quality !== 'below-average' ? `stat-${quality}` : '';
        
        return (
            <span className={className}>
                {formattedValue}
            </span>
        );
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

    const hasNote = !!playerRanking?.note;

    return (
        <div className={className}>
            <div className="player-item-row">
                <div className="player-photos">
                    { teamLogo && (<img className="team-logo" src={teamLogo} width="32" />) }
                    <img className="player-headshot" src={player.headshot.replace('w=96', 'w=426').replace('h=70', 'h=320')} width="96" onError={(e) => { (e.target as HTMLImageElement).src = '/assets/images/player-fallback.png'; }} />
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
                    <div className="player-status">
                        {player.averageDraftPosition && (
                            <div className="adp">
                                <span className="adp-label">ADP</span>
                                <span className="adp-value">{Math.round(player.averageDraftPosition * 10) / 10}</span>
                                {player.adpChange && (
                                    <span className={`adp-change ${player.adpChange > 0 ? 'positive' : 'negative'}`}>
                                        ({player.adpChange > 0 ? '+' : ''}{player.adpChange}%)
                                    </span>
                                )}
                            </div>
                        )}
                        {player.injuryStatus && player.injuryStatus !== "ACTIVE" && (
                            <div className="injury-status">
                                {player.injuryStatus === "DAY_TO_DAY" ? "D2D" : player.injuryStatus}
                            </div>
                        )}
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

            {notesEditable ? (
                <div className="player-note">
                    <textarea
                        className="player-note-input"
                        placeholder="Add a note..."
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        onBlur={() => updatePlayerNote(playerId, noteText)}
                        rows={1}
                    />
                </div>
            ) : hasNote ? (
                <div className="player-note player-note--readonly">
                    <p className="player-note-text">{playerRanking.note}</p>
                </div>
            ) : null}
        </div>
    )
}

export default PlayerItem
