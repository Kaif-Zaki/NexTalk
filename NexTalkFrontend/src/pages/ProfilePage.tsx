import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { API_BASE } from '../lib/constants'

type ProfilePageProps = {
  onBack: () => void
}

export function ProfilePage({ onBack }: ProfilePageProps) {
  const { user, apiRequest, refreshUser, logout } = useAuth()
  const { notify } = useToast()
  const [username, setUsername] = useState(user?.username ?? '')
  const [mobileNumber, setMobileNumber] = useState(user?.mobileNumber ?? '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setUsername(user?.username ?? '')
    setMobileNumber(user?.mobileNumber ?? '')
  }, [user?.username, user?.mobileNumber])

  const avatarSrc = user?.avatarUrl ? `${API_BASE}${user.avatarUrl}` : null

  async function handleSave() {
    if (!username.trim()) {
      notify('Username is required')
      return
    }
    try {
      setSaving(true)
      await apiRequest('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          username: username.trim(),
          mobileNumber: mobileNumber.trim(),
        }),
      })
      await refreshUser()
      notify('Profile saved')
    } catch (error) {
      notify((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      notify('Please select an image file')
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        setUploading(true)
        await apiRequest('/api/users/me/avatar', {
          method: 'POST',
          body: JSON.stringify({ imageData: reader.result }),
        })
        await refreshUser()
        notify('Avatar updated')
      } catch (error) {
        notify((error as Error).message)
      } finally {
        setUploading(false)
      }
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  async function handleDeleteAccount() {
    const ok = window.confirm('Delete your account permanently?')
    if (!ok) return
    try {
      await apiRequest('/api/users/me', { method: 'DELETE' })
      logout()
      notify('Account deleted')
      onBack()
    } catch (error) {
      notify((error as Error).message)
    }
  }

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
          <div className="avatar avatar--xl">
            {avatarSrc ? (
              <img src={avatarSrc} alt="Profile avatar" />
            ) : (
              user?.username?.[0] ?? 'K'
            )}
          </div>
          <div>
            <p className="user-name">{user?.username ?? 'Guest'}</p>
            <p className="user-role">{user?.email ?? 'Sign in'}</p>
          </div>
          <input
            ref={fileInputRef}
            className="hidden-input"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
          />
          <button
            className="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Change photo'}
          </button>
        </div>
        <div className="profile-info">
          <label className="field">
            Full name
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label className="field">
            Email
            <input value={user?.email ?? ''} disabled />
          </label>
          <label className="field">
            Mobile number
            <input
              value={mobileNumber}
              onChange={(event) => setMobileNumber(event.target.value)}
              placeholder="+94 77 123 4567"
            />
          </label>
        </div>
      </div>
      <div className="panel-actions">
        <button className="ghost" onClick={() => notify('Changes discarded')}>
          Discard
        </button>
        <button className="ghost" onClick={handleDeleteAccount}>
          Delete account
        </button>
        <button className="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
