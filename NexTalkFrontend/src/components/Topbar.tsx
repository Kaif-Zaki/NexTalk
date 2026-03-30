import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

type TopbarProps = {
  onNewChat: () => void
}

export function Topbar({ onNewChat }: TopbarProps) {
  const { token, logout } = useAuth()
  const { notify } = useToast()

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">N</span>
        <div>
          <p className="brand-name">NexTalk</p>
          <p className="brand-tag">Realtime team collaboration</p>
        </div>
      </div>
      <div className="topbar-actions">
        {token ? (
          <button className="ghost" onClick={logout}>
            Sign out
          </button>
        ) : null}
        <button
          className="ghost"
          onClick={() =>
            token ? notify('Invite sent') : notify('Login to invite')
          }
        >
          Invite
        </button>
        <button
          className="ghost"
          onClick={() =>
            token ? notify('Share link copied') : notify('Login to share')
          }
        >
          Share
        </button>
        <button className="primary" onClick={onNewChat}>
          New chat
        </button>
      </div>
    </header>
  )
}
