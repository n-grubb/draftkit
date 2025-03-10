
import {useContext } from 'react'
import {StoreContext} from '~/data/store'
import ModeSelector from '~/components/ModeSelector'

const AppHeader = () => {
    const {ranking} = useContext(StoreContext);
    
    return (
        <header data-component="AppHeader">
            <h1>draftkit</h1>
            <div className="ranking-actions">
                { ranking && (<span className="ranking-id">#{ranking.id}</span>) }
                <ModeSelector />
            </div>
           
        </header>
    )
}



export default AppHeader