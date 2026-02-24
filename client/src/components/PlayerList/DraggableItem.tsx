import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const DraggableItem = ({ id, children }) => {
    const {
        attributes,
        listeners,
        transform,
        transition,
        setNodeRef,
        isDragging
    } = useSortable({
        id
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition,
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 1 : 0,
        position: 'relative' as const,
    }

    return (
        <tr
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            style={style}
            className="draggable-item player-row"
        >
            { children }
        </tr>
    )
}

export default DraggableItem
