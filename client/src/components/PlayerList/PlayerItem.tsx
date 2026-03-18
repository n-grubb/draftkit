import {useContext, useState, useRef, useEffect} from 'react'
import {StoreContext} from '~/data/store'
import {DraftContext} from '~/data/draftContext'
import {formatStatValue, evaluateStatQuality} from '~/features/stats'
import {isBatter, isPitcher} from '~/features/positions'
import {ALL_BATTING_COLUMNS, ALL_PITCHING_COLUMNS} from '~/features/filtering/columns'

const BATTING_COLUMN_IDS = new Set(ALL_BATTING_COLUMNS.map(col => col.id));
const PITCHING_COLUMN_IDS = new Set(ALL_PITCHING_COLUMNS.map(col => col.id));

const FALLBACK_IMAGE = `${import.meta.env.BASE_URL}assets/images/player-fallback.png`

const EXCLUDED_POSITIONS = ['1B/3B', '2B/SS', 'P', 'UTIL']
const SIMPLE_POSITION_FILTERS = new Set(['C', '1B', '2B', 'SS', '3B', 'OF', 'DH', 'SP', 'RP']);

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

const PencilIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        <path d="m15 5 4 4"/>
    </svg>
)

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
    </svg>
)

const RowActions = ({ playerId, playerRanking, showNote, isEditing, onToggleNote }) => {
    const {ignorePlayer, highlightPlayer} = useContext(StoreContext);
    const hasNote = !!playerRanking?.note;
    const hasCustomProjections = playerRanking?.customProjections && Object.keys(playerRanking.customProjections).length > 0;
    const isHighlighted = !!playerRanking?.highlight;
    const isIgnored = !!playerRanking?.ignore;

    return (
        <>
            <button
                className={`icon-btn comment-btn${(hasNote || hasCustomProjections || showNote) ? ' active' : ''}${isEditing ? ' editing' : ''}`}
                onClick={onToggleNote}
                title={isEditing ? 'Save & close' : 'Edit projections & notes'}
            >
                {isEditing ? <CheckIcon /> : <PencilIcon />}
            </button>
            <button
                className={`icon-btn ignore-btn${isIgnored ? ' active' : ''}`}
                onClick={() => ignorePlayer(playerId)}
                title={isIgnored ? 'Unignore' : 'Ignore'}
            >
                <IgnoreIcon />
            </button>
            <button
                className={`icon-btn highlight-btn${isHighlighted ? ' active' : ''}`}
                onClick={() => highlightPlayer(playerId)}
                title={isHighlighted ? 'Unhighlight' : 'Highlight'}
            >
                <HighlightIcon />
            </button>
        </>
    );
}

const PlayerItem = (props) => {
    const {playerId, playerRanking, editable, onNameClick, columns, rank, posFilter, showNote, isEditing, onToggleNote} = props
    const {players, teams, mode, ranking} = useContext(StoreContext);
    const {isMyTurn, draftPlayer} = useContext(DraftContext);

    const isDraftMode = mode === 'draft';

    const player = players[playerId]
    const projections = player.projections

    let positions = player.pos.filter(position => !EXCLUDED_POSITIONS.includes(position))
    if (positions.length > 1 && !positions.includes('SP')) {
        positions = positions.filter(position => position != 'DH')
    }

    const useCustom = ranking.useCustomProjections !== false;
    const customProjections = useCustom ? playerRanking?.customProjections : null;

    const renderCellValue = (player, columnId) => {
        // Show "--" for inapplicable stat categories (e.g., pitching stats for batters)
        const playerHasBattingPos = player.pos?.some(p => isBatter(p));
        const playerHasPitchingPos = player.pos?.some(p => isPitcher(p));
        if (PITCHING_COLUMN_IDS.has(columnId) && !playerHasPitchingPos) {
            return <span className="stat-neutral">—</span>;
        }
        if (BATTING_COLUMN_IDS.has(columnId) && !playerHasBattingPos) {
            return <span className="stat-neutral">—</span>;
        }

        const isCustom = customProjections?.[columnId] != null;
        let value = customProjections?.[columnId] ?? projections?.[columnId] ?? player[columnId] ?? null;

        if (value == null) {
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

        return <span className={`${className}${isCustom ? ' stat-custom' : ''}`}>{formattedValue}</span>;
    }

    const team = teams[player.team_id]
    const teamLogo = team.logo?.href
    const injuryLabel = getInjuryLabel(player.injuryStatus)

    const onDraft = () => draftPlayer(playerId)

    return (
        <>
            <td className="rank-cell">{rank}.</td>
            <td className="player-identity-cell">
                <div className="player-photos">
                    {teamLogo && <img className="team-logo" src={teamLogo} width="24" />}
                    <img className="player-headshot" src={player.headshot.replace('w=96', 'w=426').replace('h=70', 'h=320')} width="72" onError={(e) => { const img = e.target as HTMLImageElement; if (!img.src.endsWith(FALLBACK_IMAGE)) { img.src = FALLBACK_IMAGE; } }} />
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
            <td className="spacer-cell"></td>
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
            <td className="vs-adp-cell">
                {(() => {
                    const isPositionalMode = posFilter && SIMPLE_POSITION_FILTERS.has(posFilter);
                    if (isPositionalMode) {
                        const fproRank = player.fantasyProsPositionalRank?.[posFilter];
                        if (!fproRank) return <span className="stat-neutral">—</span>;
                        const diff = fproRank - rank;
                        let className = 'vs-adp-neutral';
                        if (diff > 50) className = 'vs-adp-gold';
                        else if (diff > 10) className = 'vs-adp-green';
                        else if (diff < -10) className = 'vs-adp-red';
                        return <span className={className}>{diff > 0 ? '+' : ''}{diff}</span>;
                    }
                    if (!player.averageDraftPosition) return <span className="stat-neutral">—</span>;
                    const adpRound = Math.round(player.averageDraftPosition);
                    const diff = adpRound - rank;
                    let className = 'vs-adp-neutral';
                    if (diff > 50) className = 'vs-adp-gold';
                    else if (diff > 10) className = 'vs-adp-green';
                    else if (diff < -10) className = 'vs-adp-red';
                    return <span className={className}>{diff > 0 ? '+' : ''}{diff}</span>;
                })()}
            </td>
            <td className="spacer-cell"></td>
            {columns.map(column => (
                <td key={column.id} className={`stat-cell${isEditing && editable && !isDraftMode ? ' stat-cell-editing' : ''}`}>
                    {isEditing && editable && !isDraftMode ? (
                        <StatCellInput
                            playerId={playerId}
                            statId={column.id}
                            label={column.name}
                            projections={projections}
                            customProjections={playerRanking?.customProjections}
                        />
                    ) : (
                        renderCellValue(player, column.id)
                    )}
                </td>
            ))}
            {editable && !isDraftMode && (
                <td className="actions-cell">
                    <div className={`actions-wrapper${isEditing ? ' editing' : ''}`}>
                        <RowActions
                            playerId={playerId}
                            playerRanking={playerRanking}
                            showNote={showNote}
                            isEditing={isEditing}
                            onToggleNote={onToggleNote}
                        />
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

const PlayerNoteRow = ({ playerId, playerRanking, colSpan, editable, isEditing, isEven }) => {
    const {updatePlayerNote} = useContext(StoreContext);

    const [noteText, setNoteText] = useState(playerRanking?.note || '');
    const noteRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing) {
            setTimeout(() => noteRef.current?.focus(), 0);
        }
    }, [isEditing]);

    return (
        <tr className={`note-row${isEven ? ' even-row' : ''}`}>
            <td colSpan={colSpan} className="note-row-cell">
                {isEditing ? (
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

const StatCellInput = ({ playerId, statId, label, projections, customProjections }) => {
    const {updatePlayerProjection} = useContext(StoreContext);
    const isCustom = customProjections?.[statId] != null;
    const originalValue = projections?.[statId] ?? '';
    const currentValue = customProjections?.[statId] ?? originalValue;
    const [value, setValue] = useState(isCustom ? String(currentValue) : '');

    const handleBlur = () => {
        const parsed = value === '' ? null : Number(value);
        if (parsed === null || parsed === originalValue) {
            updatePlayerProjection(playerId, statId, null);
        } else if (!isNaN(parsed)) {
            updatePlayerProjection(playerId, statId, parsed);
        }
    };

    const placeholder = originalValue !== '' ? formatStatValue(statId, originalValue) : '—';

    return (
        <div className="stat-cell-input-wrapper">
            <input
                type="text"
                inputMode="decimal"
                className={`stat-cell-input${isCustom ? ' custom' : ''}`}
                value={value}
                placeholder={placeholder}
                onChange={(e) => setValue(e.target.value)}
                onBlur={handleBlur}
            />
            <span className="stat-cell-input-label">{label}</span>
        </div>
    );
}

export { PlayerNoteRow }
export default PlayerItem
