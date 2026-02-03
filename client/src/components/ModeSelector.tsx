import {useContext } from 'react'
import {StoreContext} from '../data/store'

const ModeSelector = () => {
    const {mode, updateMode} = useContext(StoreContext);

    const onChange = (selectionSet) => {
        let iterator = selectionSet.values()
        updateMode(iterator.next().value)
    }
    
    return (
        <div className="mode-selector">
            <label className={`mode-option ${mode === 'view' && 'selected'}`}>
                <span>view</span>
                <input type="radio" name="mode" value="view" checked={mode === 'view'} onChange={() => updateMode('view')} />
            </label>

            <label className={`mode-option ${mode === 'edit' && 'selected'}`}>
                <span>edit</span>
                <input type="radio" name="mode" value="edit" checked={mode === 'edit'} onChange={() => updateMode('edit')} />
            </label>

            <label className={`mode-option ${mode === 'draft' && 'selected'}`}>
                <span>draft</span>
                <input type="radio" name="mode" value="draft" checked={mode === 'draft'} onChange={() => updateMode('draft')} />
            </label>
        </div>
    )   
}

export default ModeSelector