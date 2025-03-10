import {useContext} from 'react'
import {StoreContext, StoreProvider} from '~/data/store'
import DraftProvider from '~/data/draftContext'
import StatsPrefsProvider from '~/data/statsPrefsContext'
import AppHeader from '~/components/AppHeader'
import AppFooter from '~/components/AppFooter'
import PlayerList from '~/components/PlayerList/PlayerList'
import Draft from '~/components/Draft/Draft'

function App() {
  return (
    <StoreProvider>
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

  // @todo: if no ranking exists, show onboarding. 

  return (
    <div id="app" className={`mode--${mode}`}>
      <AppHeader />
        <main className={ mode == 'draft' ? 'fullwidth' : undefined }>
          <AppRouter mode={mode} />
        </main>
      <AppFooter />
      {/* <div className={`bg-effect mode--${mode}`} /> */}
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

  // Not a valid mode. 
  console.error(`${mode} is not a valid mode`, { mode })

  return <></>
}

export default App
