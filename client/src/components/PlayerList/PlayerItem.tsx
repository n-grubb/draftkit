import {useContext, useState, useRef, useEffect} from 'react'
import {StoreContext} from '~/data/store'
import {DraftContext} from '~/data/draftContext'
import {formatStatValue, evaluateStatQuality} from '~/features/stats'

const EXCLUDED_POSITIONS = ['1B/3B', '2B/SS', 'P', 'UTIL']

const INJURY_LABELS = {
    'DAY_TO_DAY': 'DTD',
    'OUT': 'O',
    'SEVEN_DAY_DL': 'IL7',
    'TEN_DAY_DL': 'IL10',
    'FIFTEEN_DAY_DL': 'IL15',
    'SIXTY_DAY_DL': 'IL60',
    'SUSPENSION': 'SUSP',
    'PATERNITY': 'PAT',
    'BEREAVEMENT': 'BRV',
}

const getInjuryLabel = (status) => {
    if (!status || status === 'ACTIVE') return null
    return INJURY_LABELS[status] || status
}

const IgnoreIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
)

const HighlightIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
)

const CommentIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
)

const PlayerItem = (props) => {
    const {playerId, playerRanking, editable, onNameClick, columns, rank, showNote, onToggleNote} = props
    const {players, teams, mode, ignorePlayer, highlightPlayer} = useContext(StoreContext);
    const {isMyTurn, draftPlayer} = useContext(DraftContext);

    const isDraftMode = mode === 'draft';
    const hasNote = !!playerRanking?.note;

    const player = players[playerId]
    const projections = player.projections

    let positions = player.pos.filter(position => !EXCLUDED_POSITIONS.includes(position))
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
            return <span className="stat-neutral">—</span>;
        }

        let primaryPosition = null;
        if (player.pos.includes('SP')) {
            primaryPosition = 'SP';
        } else if (player.pos.includes('RP')) {
            primaryPosition = 'RP';
        }

        const quality = evaluateStatQuality(columnId, value, primaryPosition);
        const formattedValue = formatStatValue(columnId, value);
        const className = quality !== 'below-average' ? `stat-${quality}` : '';

        return <span className={className}>{formattedValue}</span>;
    }

    const team = teams[player.team_id]
    const teamLogo = team.logo?.href
    const injuryLabel = getInjuryLabel(player.injuryStatus)

    const onHighlight = () => highlightPlayer(playerId)
    const onIgnore = () => ignorePlayer(playerId)
    const onDraft = () => draftPlayer(playerId)

    const isHighlighted = !!playerRanking?.highlight
    const isIgnored = !!playerRanking?.ignore

    return (
        <>
            <td className="rank-cell">{rank}.</td>
            <td className="player-identity-cell">
                <div className="player-photos">
                    {teamLogo && <img className="team-logo" src={teamLogo} width="24" />}
                    <img className="player-headshot" src={player.headshot.replace('w=96', 'w=426').replace('h=70', 'h=320')} width="72" onError={(e) => { (e.target as HTMLImageElement).src = '/assets/images/player-fallback.png'; }} />
                </div>
                <div className="player-identity">
                    <div className="player-name-row">
                        <span className="player-name" onClick={onNameClick}>{player.name}</span>
                        {injuryLabel && (
                            <span className="injury-designation">{injuryLabel}</span>
                        )}
                    </div>
                    <div className="player-meta small">
                        <span className="player-team-abbrev">{team.abbrev}</span>
                        <span className="player-position-list">
                            {positions.map((position, i) => (
                                <span key={position}>
                                    {i > 0 && ', '}
                                    <span className="player-pos" data-pos={position}>{position}</span>
                                </span>
                            ))}
                        </span>
                    </div>
                </div>
            </td>
            <td className="adp-cell">
                <div className="adp-info">
                    {player.averageDraftPosition && (
                        <div className="adp">
                            <span className="adp-value">{Math.round(player.averageDraftPosition * 10) / 10}</span>
                            {player.adpChange && (
                                <span className={`adp-change ${player.adpChange > 0 ? 'positive' : 'negative'}`}>
                                    ({player.adpChange > 0 ? '+' : ''}{player.adpChange}%)
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </td>
            <td className="rank-source-cell">
                {player.espnRank ? player.espnRank : <span className="stat-neutral">—</span>}
            </td>
            <td className="rank-source-cell">
                {player.fantasyProsRank ? player.fantasyProsRank : <span className="stat-neutral">—</span>}
            </td>
            {columns.map(column => (
                <td key={column.id} className="stat-cell">
                    {renderCellValue(player, column.id)}
                </td>
            ))}
            {editable && !isDraftMode && (
                <td className="actions-cell">
                    <div className="actions-wrapper">
                        <button
                            className={`icon-btn comment-btn${(hasNote || showNote) ? ' active' : ''}`}
                            onClick={onToggleNote}
                            title={showNote ? 'Hide comment' : 'Add comment'}
                        >
                            <CommentIcon />
                        </button>
                        <button
                            className={`icon-btn ignore-btn${isIgnored ? ' active' : ''}`}
                            onClick={onIgnore}
                            title={isIgnored ? 'Unignore' : 'Ignore'}
                        >
                            <IgnoreIcon />
                        </button>
                        <button
                            className={`icon-btn highlight-btn${isHighlighted ? ' active' : ''}`}
                            onClick={onHighlight}
                            title={isHighlighted ? 'Unhighlight' : 'Highlight'}
                        >
                            <HighlightIcon />
                        </button>
                    </div>
                </td>
            )}
            {isDraftMode && (
                <td className="actions-cell">
                    {isMyTurn() ? (
                        <button onClick={onDraft} className="draft-button">Draft</button>
                    ) : (
                        <button onClick={onDraft} className="drafted-button">Drafted</button>
                    )}
                </td>
            )}
        </>
    )
}

const PlayerNoteRow = ({ playerId, playerRanking, colSpan, editable, isEven }) => {
    const {updatePlayerNote, userRanking} = useContext(StoreContext);
    const notesEditable = editable && (!userRanking?.isShared || !!userRanking?.pin);
    const [noteText, setNoteText] = useState(playerRanking?.note || '');
    const noteRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (notesEditable) {
            setTimeout(() => noteRef.current?.focus(), 0);
        }
    }, []);

    return (
        <tr className={`note-row${isEven ? ' even-row' : ''}`}>
            <td colSpan={colSpan} className="note-row-cell">
                {notesEditable ? (
                    <textarea
                        ref={noteRef}
                        className="player-note-input"
                        placeholder="Add a note…"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        onBlur={() => updatePlayerNote(playerId, noteText)}
                        rows={1}
                    />
                ) : (
                    <p className="player-note-text">{playerRanking?.note}</p>
                )}
            </td>
        </tr>
    )
}

export { PlayerNoteRow }
export default PlayerItem
