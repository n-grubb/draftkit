import { useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const DraggableItem = ({ id, className, children }) => {
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

    const rowRef = useRef<HTMLTableRowElement>(null)
    const heightRef = useRef<number | null>(null)

    // Capture the row height when a drag starts
    useEffect(() => {
        if (isDragging && rowRef.current) {
            heightRef.current = rowRef.current.getBoundingClientRect().height
        } else if (!isDragging) {
            heightRef.current = null
        }
    }, [isDragging])

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition,
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 1 : 0,
        position: 'relative' as const,
        height: isDragging && heightRef.current ? `${heightRef.current}px` : undefined,
    }

    return (
        <tr
            ref={(node) => {
                setNodeRef(node)
                rowRef.current = node
            }}
            {...attributes}
            {...listeners}
            style={style}
            className={`draggable-item ${className || 'player-row'}`}
        >
            { children }
        </tr>
    )
}

export default DraggableItem
