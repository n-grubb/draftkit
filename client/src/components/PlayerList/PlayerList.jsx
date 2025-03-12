import {useContext, useState, useEffect} from 'react'
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

const PlayerList = ({ editable }) => {
    const {players, ranking, mode} = useContext(StoreContext);
    const {isMyTurn, draftPlayer, draftedPlayers} = useContext(DraftContext);
    
    const [posFilter, setPosFilter] = useState(undefined)
    const [rankedPlayerIds, setRankedPlayerIds] = useState([]);
    const [showCardForPlayerId, setShowCardForPlayerId] = useState(null);
    
    // Draft mode
    const isDraftMode = mode === 'draft';
    const draftedPlayerIds = isDraftMode ? Object.values(draftedPlayers) : [];

    // Initialize and update the ordered player list based on rank
    useEffect(() => {
        if (ranking.players && Object.keys(ranking.players).length > 0) {
            // Convert the players object to an ordered array
            const playerIds = Object.keys(ranking.players);
            const orderedIds = [...playerIds].sort((a, b) => {
                return ranking.players[a].rank - ranking.players[b].rank
            });
            
            setRankedPlayerIds(orderedIds);
        }
    }, [ranking.players]);

    /* DND-KIT config */
    // Setup sensors, needed to support touch events on mobile.
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: { distance: 5 }
        }),
        useSensor(TouchSensor, {}),
        useSensor(KeyboardSensor, {})
    )
    
    // Reorder rows after drag & drop
    // When a drag ends, update the ranking. 
    const handleDragEnd = (event) => {
        const { active, over } = event
        if (active && over && active.id !== over.id) {
            setRankedPlayerIds(prev => {
                const oldIndex = prev.indexOf(active.id)
                const newIndex = prev.indexOf(over.id)
                const updatedRanking = arrayMove(prev, oldIndex, newIndex)
                return updatedRanking
            })
        }
    }
    /* /END DND-KIT config */

    function filterPlayers(playerId) {
        const player = players?.[playerId]
        if (!player) { return false }
        
        // Filter out already drafted players in draft mode
        if (isDraftMode && draftedPlayerIds.includes(playerId)) {
            return false;
        }
        
        const matchesFilterSearch = posFilter ? player.pos.includes(posFilter) : true
        return matchesFilterSearch
    }

    return (
        <>
            <FilterBar 
                posFilter={posFilter} 
                onPosChange={value => setPosFilter(value)}
                draftMode={isDraftMode}
            />

            {/* @todo: move to toast? */}
            <UnsavedChangesPrompt rankedPlayerIds={rankedPlayerIds} />

            <DndContext
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                sensors={sensors}
                onDragEnd={handleDragEnd}
            >
                <ol>
                    <SortableContext
                        items={rankedPlayerIds}
                        strategy={verticalListSortingStrategy}
                    >
                        {
                            rankedPlayerIds
                                .filter(filterPlayers)
                                .map((playerId, index) => {
                                    return editable ? (
                                        <DraggableItem key={playerId} id={playerId} >
                                            <PlayerItem 
                                                playerId={playerId} 
                                                playerRanking={ranking.players[playerId]} 
                                                editable 
                                                onNameClick={() => setShowCardForPlayerId(playerId)}
                                            />
                                        </DraggableItem>
                                    ) : (
                                        <li key={playerId}>
                                            <PlayerItem 
                                                playerId={playerId} 
                                                playerRanking={ranking.players[playerId]} 
                                                onNameClick={() => setShowCardForPlayerId(playerId)}
                                            />
                                        </li>
                                    );
                                })
                        }
                    </SortableContext>
                </ol>
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
    
    // Check if the current order is different from the stored ranking
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