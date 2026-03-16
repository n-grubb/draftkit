import React, {useContext, useState, useEffect, useRef} from 'react'
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
import PlayerItem, {PlayerNoteRow} from './PlayerItem'
import PlayerCard from './PlayerCard'
import Toast from '~/components/Toast'
import {StoreContext} from '~/data/store'
import {DraftContext} from '~/data/draftContext'
import {StatsPrefsContext} from '~/data/statsPrefsContext'
import {statsForFilter} from '~/features/filtering/columns'

const PlayerList = ({ editable }: any) => {
    const {players, ranking, mode} = useContext(StoreContext);
    const {draftedPlayers} = useContext(DraftContext);
    const {selectedBattingStats, selectedPitchingStats} = useContext(StatsPrefsContext);

    const [posFilter, setPosFilter] = useState(undefined)
    const [rankedPlayerIds, setRankedPlayerIds] = useState([]);
    const [showCardForPlayerId, setShowCardForPlayerId] = useState(null);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
    const [allNotesExpanded, setAllNotesExpanded] = useState(false);

    const isDraftMode = mode === 'draft';
    const draftedPlayerIds = isDraftMode ? Object.values(draftedPlayers) : [];

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
        if (!posFilter) return true
        if (posFilter === 'DH') {
            return player.pos.every(p => p === 'DH' || p === 'UTIL')
        }
        return player.pos.includes(posFilter)
    }

    const columns = isDraftMode
        ? statsForFilter(posFilter)
        : statsForFilter(posFilter, selectedBattingStats, selectedPitchingStats);

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

    // Apply position filter + search first (no sort yet) — this is used for rank numbers
    let rankedBeforeSort = rankedPlayerIds.filter(filterPlayers);
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        rankedBeforeSort = rankedBeforeSort.filter(id =>
            players[id]?.name.toLowerCase().includes(q)
        );
    }

    // Apply sort on top for visual ordering only
    const displayedPlayerIds = sortColumn
        ? [...rankedBeforeSort].sort((a, b) => {
            const getVal = (id) => {
                const p = players[id];
                return p?.[sortColumn] ?? p?.projections?.[sortColumn] ?? 0;
            };
            return sortDirection === 'desc' ? getVal(b) - getVal(a) : getVal(a) - getVal(b);
        })
        : rankedBeforeSort;

    const toggleNote = (playerId: string) => {
        setExpandedNotes(prev => ({ ...prev, [playerId]: !prev[playerId] }));
    }

    const toggleAllNotes = () => {
        const next = !allNotesExpanded;
        setAllNotesExpanded(next);
        if (next) {
            const all: Record<string, boolean> = {};
            displayedPlayerIds.forEach(id => {
                if (ranking.players[id]?.note) {
                    all[id] = true;
                }
            });
            setExpandedNotes(all);
        } else {
            setExpandedNotes({});
        }
    }

    const isNoteExpanded = (playerId: string) => {
        return !!expandedNotes[playerId];
    }

    const headerRef = useRef<HTMLTableRowElement>(null);
    const totalColumns = headerRef.current?.children.length || 1;

    return (
        <>
            <FilterBar
                posFilter={posFilter}
                onPosChange={value => setPosFilter(value)}
                draftMode={isDraftMode}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                allNotesExpanded={allNotesExpanded}
                onToggleAllNotes={toggleAllNotes}
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
                        <tr ref={headerRef}>
                            <th className="rank-header">#</th>
                            <th className="player-header">Player</th>
                            <th className="spacer-header"></th>
                            <th className="adp-header">ADP</th>
                            <th className="rank-source-header">ESPN</th>
                            <th className="rank-source-header">FPRO</th>
                            <th className="vs-adp-header">vsADP</th>
                            <th className="spacer-header"></th>
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
                            {displayedPlayerIds.map((playerId, visualIndex) => {
                                // Rank = 1-based position in the pre-sort filtered list
                                // (reflects live drag order and position-filtered context)
                                const rank = rankedBeforeSort.indexOf(playerId) + 1;
                                const playerRanking = ranking.players[playerId];
                                const isEven = visualIndex % 2 === 1;
                                const rowClass = `player-row${isEven ? ' even-row' : ''}${playerRanking?.highlight ? ' highlighted' : playerRanking?.ignore ? ' ignored' : ''}`;

                                const noteVisible = isNoteExpanded(playerId);

                                return editable ? (
                                    <React.Fragment key={playerId}>
                                        <DraggableItem id={playerId} className={rowClass}>
                                            <PlayerItem
                                                playerId={playerId}
                                                rank={rank}
                                                columns={columns}
                                                playerRanking={playerRanking}
                                                editable
                                                onNameClick={() => setShowCardForPlayerId(playerId)}
                                                showNote={noteVisible}
                                                onToggleNote={() => toggleNote(playerId)}
                                            />
                                        </DraggableItem>
                                        {noteVisible && (
                                            <PlayerNoteRow
                                                playerId={playerId}
                                                playerRanking={playerRanking}
                                                colSpan={totalColumns}
                                                editable={editable}
                                                isEven={isEven}
                                            />
                                        )}
                                    </React.Fragment>
                                ) : (
                                    <React.Fragment key={playerId}>
                                        <tr className={rowClass}>
                                            <PlayerItem
                                                playerId={playerId}
                                                rank={rank}
                                                columns={columns}
                                                playerRanking={playerRanking}
                                                onNameClick={() => setShowCardForPlayerId(playerId)}
                                                showNote={noteVisible}
                                                onToggleNote={() => toggleNote(playerId)}
                                            />
                                        </tr>
                                        {noteVisible && (
                                            <PlayerNoteRow
                                                playerId={playerId}
                                                playerRanking={playerRanking}
                                                colSpan={totalColumns}
                                                editable={editable}
                                                isEven={isEven}
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
