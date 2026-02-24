import React, {useContext, useState, useEffect} from 'react'
import {
    DndContext,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import FilterBar from '~/components/FilterBar'
import DraggableItem from './DraggableItem'
import PlayerItem from './PlayerItem'
import PlayerCard from './PlayerCard'
import Toast from '~/components/Toast'
import {StoreContext} from '~/data/store'
import {DraftContext} from '~/data/draftContext'
import {StatsPrefsContext} from '~/data/statsPrefsContext'
import {statsForFilter} from '~/features/filtering/columns'

const PlayerList = ({ editable }: any) => {
    const {players, ranking, mode, updatePlayerNote} = useContext(StoreContext);
    const {draftedPlayers} = useContext(DraftContext);
    const {selectedBattingStats, selectedPitchingStats} = useContext(StatsPrefsContext);

    const [posFilter, setPosFilter] = useState(undefined)
    const [rankedPlayerIds, setRankedPlayerIds] = useState([]);
    const [showCardForPlayerId, setShowCardForPlayerId] = useState(null);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [searchQuery, setSearchQuery] = useState('');

    // Draft mode
    const isDraftMode = mode === 'draft';
    const draftedPlayerIds = isDraftMode ? Object.values(draftedPlayers) : [];

    // Initialize and update the ordered player list based on rank.
    useEffect(() => {
        if (ranking.players && Object.keys(ranking.players).length > 0) {
            const playerIds = Object.keys(ranking.players);
            const orderedIds = [...playerIds].sort((a, b) => {
                return ranking.players[a].rank - ranking.players[b].rank
            });
            setRankedPlayerIds(orderedIds);
        }
    }, [ranking.id]);

    /* DND-KIT config */
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, {}),
        useSensor(KeyboardSensor, {})
    )

    const handleDragStart = () => {
        setSortColumn(null);
        setSearchQuery('');
    }

    const handleDragEnd = (event) => {
        const { active, over } = event
        if (active && over && active.id !== over.id) {
            setRankedPlayerIds(prev => {
                const oldIndex = prev.indexOf(active.id)
                const newIndex = prev.indexOf(over.id)
                return arrayMove(prev, oldIndex, newIndex)
            })
        }
    }
    /* /END DND-KIT config */

    function filterPlayers(playerId) {
        const player = players?.[playerId]
        if (!player) { return false }
        if (isDraftMode && draftedPlayerIds.includes(playerId)) { return false; }
        const matchesFilterSearch = posFilter ? player.pos.includes(posFilter) : true
        return matchesFilterSearch
    }

    // Resolve table columns at the list level
    const columns = isDraftMode
        ? statsForFilter(posFilter)
        : statsForFilter(posFilter, selectedBattingStats, selectedPitchingStats);

    // Column sort handler (desc → asc → off)
    const handleSortClick = (colId: string) => {
        if (sortColumn === colId) {
            if (sortDirection === 'desc') {
                setSortDirection('asc');
            } else {
                setSortColumn(null);
            }
        } else {
            setSortColumn(colId);
            setSortDirection('desc');
        }
    };

    // Build displayed player list: position filter → search → sort
    let displayedPlayerIds = rankedPlayerIds.filter(filterPlayers);

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        displayedPlayerIds = displayedPlayerIds.filter(id =>
            players[id]?.name.toLowerCase().includes(q)
        );
    }

    if (sortColumn) {
        displayedPlayerIds = [...displayedPlayerIds].sort((a, b) => {
            const getVal = (playerId) => {
                const p = players[playerId];
                const proj = p?.projections;
                return p?.[sortColumn] ?? proj?.[sortColumn] ?? 0;
            };
            const valA = getVal(a);
            const valB = getVal(b);
            return sortDirection === 'desc' ? valB - valA : valA - valB;
        });
    }

    // Total column count: rank + player + adp + stats + (actions if editable)
    const totalCols = 3 + columns.length + (editable ? 1 : 0);

    return (
        <>
            <FilterBar
                posFilter={posFilter}
                onPosChange={value => setPosFilter(value)}
                draftMode={isDraftMode}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />

            <UnsavedChangesPrompt rankedPlayerIds={rankedPlayerIds} />

            <DndContext
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <table className="player-table">
                    <thead>
                        <tr>
                            <th className="rank-header">#</th>
                            <th className="player-header">Player</th>
                            <th className="adp-header">ADP</th>
                            {columns.map(col => (
                                <th
                                    key={col.id}
                                    className={`stat-header${sortColumn === col.id ? ' sorted' : ''}`}
                                    onClick={() => handleSortClick(col.id)}
                                >
                                    {col.name}
                                    {sortColumn === col.id && (
                                        <span className="sort-indicator">
                                            {sortDirection === 'desc' ? '↓' : '↑'}
                                        </span>
                                    )}
                                </th>
                            ))}
                            {editable && <th className="actions-header"></th>}
                        </tr>
                    </thead>
                    <tbody>
                        <SortableContext
                            items={rankedPlayerIds}
                            strategy={verticalListSortingStrategy}
                        >
                            {displayedPlayerIds.map(playerId => {
                                const rank = ranking.players[playerId].rank + 1;
                                return (
                                    <React.Fragment key={playerId}>
                                        {editable ? (
                                            <DraggableItem id={playerId}>
                                                <PlayerItem
                                                    playerId={playerId}
                                                    rank={rank}
                                                    columns={columns}
                                                    playerRanking={ranking.players[playerId]}
                                                    editable
                                                    onNameClick={() => setShowCardForPlayerId(playerId)}
                                                />
                                            </DraggableItem>
                                        ) : (
                                            <tr className={`player-row${ranking.players[playerId]?.highlight ? ' highlighted' : ranking.players[playerId]?.ignore ? ' ignored' : ''}`}>
                                                <PlayerItem
                                                    playerId={playerId}
                                                    rank={rank}
                                                    columns={columns}
                                                    playerRanking={ranking.players[playerId]}
                                                    onNameClick={() => setShowCardForPlayerId(playerId)}
                                                />
                                            </tr>
                                        )}
                                        {editable && (
                                            <PlayerNoteRow
                                                playerId={playerId}
                                                playerRanking={ranking.players[playerId]}
                                                colSpan={totalCols}
                                                updatePlayerNote={updatePlayerNote}
                                                userRanking={ranking}
                                            />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </SortableContext>
                    </tbody>
                </table>
            </DndContext>

            {showCardForPlayerId && (
                <PlayerCard
                    playerId={showCardForPlayerId}
                    onClose={() => setShowCardForPlayerId(null)}
                />
            )}
        </>
    )
}

function PlayerNoteRow({ playerId, playerRanking, colSpan, updatePlayerNote, userRanking }) {
    const [noteText, setNoteText] = useState(playerRanking?.note || '');
    const notesEditable = !userRanking?.isShared || !!userRanking?.pin;
    const hasNote = !!playerRanking?.note;

    if (!notesEditable && !hasNote) return null;

    return (
        <tr className="note-row">
            <td></td>
            <td colSpan={colSpan - 1}>
                {notesEditable ? (
                    <textarea
                        className="player-note-input"
                        placeholder="Add a note..."
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        onBlur={() => updatePlayerNote(playerId, noteText)}
                        rows={1}
                    />
                ) : (
                    <p className="player-note-text">{playerRanking.note}</p>
                )}
            </td>
        </tr>
    );
}

function UnsavedChangesPrompt ({ rankedPlayerIds }) {
    const {ranking, updateRanking} = useContext(StoreContext);

    function isDifferentThanStoredOrder() {
        if (!ranking.players || Object.keys(ranking.players).length === 0) {
            return false;
        }
        return rankedPlayerIds.some((playerId, index) => {
            const storedRank = ranking.players[playerId]?.rank;
            return storedRank !== index;
        });
    }

    const hasUnsavedChanges = rankedPlayerIds.length > 0 ? isDifferentThanStoredOrder() : false

    return (
        <Toast
            isVisible={hasUnsavedChanges}
            message="You have unsaved changes to your ranking order."
            actionLabel="Save Changes"
            onAction={() => updateRanking(rankedPlayerIds)}
            position="bottom"
        />
    )
}

export default PlayerList
