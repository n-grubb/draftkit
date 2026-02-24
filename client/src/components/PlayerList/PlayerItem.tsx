import {useContext} from 'react'
import {StoreContext} from '~/data/store'
import {DraftContext} from '~/data/draftContext'
import {formatStatValue, evaluateStatQuality} from '~/features/stats'

const EXCLUDED_POSITIONS = ['1B/3B', '2B/SS', 'P', 'UTIL']

// Inline SVG icons
const IgnoreIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
)

const HighlightIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
)

const PlayerItem = (props) => {
    const {playerId, playerRanking, editable, onNameClick, columns, rank} = props
    const {players, teams, mode, ignorePlayer, highlightPlayer} = useContext(StoreContext);
    const {isMyTurn, draftPlayer} = useContext(DraftContext);

    const isDraftMode = mode === 'draft';

    const player = players[playerId]
    const projections = player.projections

    // Don't show specialty roster spots as POS
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

        // Get the primary position for pitchers (SP vs RP)
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

    const teamLogo = teams[player.team_id].logo?.href

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
                    {teamLogo && <img className="team-logo" src={teamLogo} width="32" />}
                    <img className="player-headshot" src={player.headshot.replace('w=96', 'w=426').replace('h=70', 'h=320')} width="96" />
                </div>
                <div className="player-identity">
                    <span className="player-name" onClick={onNameClick}>{player.name}</span>
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
            </td>
            <td className="adp-cell">
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
            </td>
            {columns.map(column => (
                <td key={column.id} className="stat-cell">
                    {renderCellValue(player, column.id)}
                </td>
            ))}
            {editable && !isDraftMode && (
                <td className="actions-cell">
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

export default PlayerItem
