import { useContext } from 'react'
import { StoreContext } from '~/data/store'
import { SportContext } from '~/data/sportContext'
import ShareRanking from './ShareRanking'

const AppFooter = () => {
    const { mode } = useContext(StoreContext);
    const { config } = useContext(SportContext);
    const canShare = !config.data.rankingsLocalOnly;

    return (
        <footer>
            {/* Show share ranking button in edit mode (server-backed sports only) */}
            {mode === 'edit' && canShare && <ShareRanking />}

            <div className="footer-info">
                <p>{config.dataCredit}</p>
            </div>
        </footer>
    )
}

export default AppFooter
