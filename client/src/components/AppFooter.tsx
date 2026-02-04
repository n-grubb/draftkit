import { useContext } from 'react'
import { StoreContext } from '~/data/store'
import ShareRanking from './ShareRanking'

const AppFooter = () => {
    const { mode } = useContext(StoreContext);
    
    return (
        <footer>
            {/* Show share ranking button in edit mode */}
            {mode === 'edit' && <ShareRanking />}
            
            <div className="footer-info">
                <p>Player data sourced from ESPN | 2026 Projections sourced from Fangraphs</p>
            </div>
        </footer>
    )
}

export default AppFooter