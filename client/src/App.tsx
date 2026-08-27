import {useContext} from 'react'
import SportProvider, {SportContext} from '~/data/sportContext'
import {StoreContext, StoreProvider} from '~/data/store'
import DraftProvider from '~/data/draftContext'
import StatsPrefsProvider from '~/data/statsPrefsContext'
import AppHeader from '~/components/AppHeader'
import AppFooter from '~/components/AppFooter'
import PlayerList from '~/components/PlayerList/PlayerList'
import Draft from '~/components/Draft/Draft'

function App() {
  return (
    <SportProvider>
      <SportedApp />
    </SportProvider>
  )
}

function SportedApp() {
  const {sport} = useContext(SportContext)
  // Re-mount the data tree on sport change so players, teams, rankings and
  // stat preferences all reload cleanly for the selected sport.
  return (
    <StoreProvider key={sport}>
      <DraftProvider>
        <StatsPrefsProvider>
          <AppLayout />
        </StatsPrefsProvider>
      </DraftProvider>
    </StoreProvider>
  )
}

function AppLayout() {
  const {mode} = useContext(StoreContext)

  return (
    <div id="app" className={`mode--${mode}`}>
      <AppHeader />
        <main className={ mode == 'draft' ? 'fullwidth' : undefined }>
          <AppRouter mode={mode} />
        </main>
      <AppFooter />
    </div>
  )
}

function AppRouter({ mode }) {
  if (mode == 'view' || mode == 'edit') {
    return <PlayerList editable={mode == 'edit'} />
  }
  if (mode == 'draft') {
    return <Draft />
  }

  console.error(`${mode} is not a valid mode`, { mode })

  return <></>
}

export default App
