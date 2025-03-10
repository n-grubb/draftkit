import {useContext} from 'react'
import {StoreContext} from '~/data/store'
import PlayerList from '~/components/PlayerList/PlayerList'
import Draft from '~/components/Draft/Draft'

const AppLayout = () => {
    const {mode} = useContext(StoreContext)

    if (mode == 'view') {
        return <PlayerList />
    }
    if (mode == 'edit') {
        return <PlayerList editable />
    }
    if (mode == 'draft') {
        return <Draft />
    }
    
    // Not a valid mode. 
    console.error(`${mode} is not a valid mode`, { mode })
    return <></>
}

export default AppLayout