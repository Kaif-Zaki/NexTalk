import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import { useToast } from './context/ToastContext'
import { Topbar } from './components/Topbar'
import { Sidebar } from './components/Sidebar'
import { MobileNav } from './components/MobileNav'
import { Toast } from './components/Toast'
import { AuthPage } from './pages/AuthPage'
import { InvitePage } from './pages/InvitePage'
import { ChatPage } from './pages/ChatPage'
import { NewChatPage } from './pages/NewChatPage'
import { ProfilePage } from './pages/ProfilePage'
import { FilesPage } from './pages/FilesPage'
import { CallsPage } from './pages/CallsPage'
import { DetailsPage } from './pages/DetailsPage'

import './App.css'

type View =
  | 'chat'
  | 'new'
  | 'profile'
  | 'files'
  | 'calls'
  | 'details'
  | 'auth'
  | 'invite'

function App() {
  const { token } = useAuth()
  const { notify } = useToast()
  const [activeView, setActiveView] = useState<View>('auth')
  const [inviteToken, setInviteToken] = useState<string | null>(null)

  useEffect(() => {
    const match = window.location.pathname.match(/\/invite\/(.+)$/)
    if (match?.[1]) {
      setInviteToken(match[1])
      setActiveView('invite')
      return
    }
    setActiveView(token ? 'chat' : 'auth')
  }, [token])

  function requireAuth(nextView: View) {
    if (!token) {
      notify('Login to continue')
      setActiveView('auth')
      return
    }
    setActiveView(nextView)
  }

  return (
    <div className="app">
      {activeView !== 'auth' && activeView !== 'invite' && (
        <Topbar onNewChat={() => requireAuth('new')} />
      )}

      {(activeView === 'auth' || activeView === 'invite') && (
        <div className="auth-shell">
          <main className="content">
            {activeView === 'auth' && (
              <AuthPage onDone={() => setActiveView('chat')} />
            )}
            {activeView === 'invite' && inviteToken && (
              <InvitePage
                token={inviteToken}
                onDone={() => setActiveView('chat')}
                onLogin={() => setActiveView('auth')}
              />
            )}
          </main>
        </div>
      )}

      {activeView !== 'auth' && activeView !== 'invite' && (
        <div className="shell">
          <Sidebar onProfile={() => setActiveView('profile')} />
          <main className="content">
            {activeView === 'chat' && (
              <ChatPage
                onFiles={() => setActiveView('files')}
                onCalls={() => setActiveView('calls')}
                onDetails={() => setActiveView('details')}
              />
            )}
            {activeView === 'new' && (
              <NewChatPage onBack={() => setActiveView('chat')} />
            )}
            {activeView === 'profile' && (
              <ProfilePage onBack={() => setActiveView('chat')} />
            )}
            {activeView === 'files' && (
              <FilesPage onBack={() => setActiveView('chat')} />
            )}
            {activeView === 'calls' && (
              <CallsPage onBack={() => setActiveView('chat')} />
            )}
            {activeView === 'details' && (
              <DetailsPage onBack={() => setActiveView('chat')} />
            )}
          </main>
        </div>
      )}

      {activeView !== 'auth' && activeView !== 'invite' && (
        <MobileNav
          active={activeView}
          onChat={() => setActiveView('chat')}
          onFiles={() => setActiveView('files')}
          onCalls={() => setActiveView('calls')}
          onProfile={() => setActiveView('profile')}
        />
      )}

      <Toast />
    </div>
  )
}

export default App
