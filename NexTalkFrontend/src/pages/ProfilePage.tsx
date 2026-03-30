import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

type ProfilePageProps = {
  onBack: () => void
}

export function ProfilePage({ onBack }: ProfilePageProps) {
  const { user } = useAuth()
  const { notify } = useToast()

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-title">Profile</p>
          <p className="panel-sub">Manage your account details.</p>
        </div>
        <button className="ghost" onClick={onBack}>
          Back to chat
        </button>
      </div>
      <div className="panel-body panel-grid">
        <div className="profile-card">
          <div className="avatar avatar--xl">{user?.username?.[0] ?? 'K'}</div>
          <div>
            <p className="user-name">{user?.username ?? 'Guest'}</p>
            <p className="user-role">{user?.email ?? 'Sign in'}</p>
          </div>
          <button className="ghost" onClick={() => notify('Avatar updated')}>
            Change photo
          </button>
        </div>
        <div className="profile-info">
          <label className="field">
            Full name
            <input defaultValue={user?.username ?? ''} />
          </label>
          <label className="field">
            Email
            <input defaultValue={user?.email ?? ''} />
          </label>
          <label className="field">
            Status
            <input defaultValue="Building NexTalk" />
          </label>
        </div>
      </div>
      <div className="panel-actions">
        <button className="ghost" onClick={() => notify('Changes discarded')}>
          Discard
        </button>
        <button className="primary" onClick={() => notify('Profile saved')}>
          Save changes
        </button>
      </div>
    </div>
  )
}
