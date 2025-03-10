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
        position: 'relative',
    }

    return (
        <li 
            ref={setNodeRef} 
            {...attributes} 
            {...listeners} 
            style={style} 
            className="draggable-item"
        >
            {/* 
            <div className="item-actions">
                <DragHandle />
                <input type="checkbox" name="selection" />
            </div> 
            */}
            { children }
        </li>
    )
}

function DragHandle() {
    return (
        <div className="drag-handle">
            <svg viewBox="0 0 20 20" width="24">
                <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
            </svg>
        </div>
    )
}

export default DraggableItem