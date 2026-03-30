import { useEffect, useState } from 'react'
import { API_BASE } from '../lib/constants'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import { useToast } from '../context/ToastContext'

type InviteInfo = {
  id: number
  chat_id: number
  invitee_email: string
  message: string
  status: string
  title: string
}

type InvitePageProps = {
  token: string
  onDone: () => void
  onLogin: () => void
}

export function InvitePage({ token, onDone, onLogin }: InvitePageProps) {
  const { apiRequest, token: authToken } = useAuth()
  const { refreshChats } = useChat()
  const { notify } = useToast()
  const [invite, setInvite] = useState<InviteInfo | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/invites/${token}`)
      .then((res) => res.json())
      .then((data) => setInvite(data.invite))
      .catch(() => setInvite(null))
  }, [token])

  async function handleAccept() {
    if (!authToken) {
      notify('Login or register to accept the invite')
      onLogin()
      return
    }

    try {
      const data = await apiRequest<{ chatId: number }>(
        `/api/invites/${token}/accept`,
        { method: 'POST' },
      )
      await refreshChats(data.chatId)
      notify('Invite accepted')
      onDone()
    } catch (error) {
      notify((error as Error).message)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-title">Chat invite</p>
          <p className="panel-sub">{invite?.title ?? 'Loading invite...'}</p>
        </div>
      </div>
      <div className="panel-body">
        <p className="invite-message">{invite?.message ?? 'Loading...'}</p>
        <p className="invite-meta">Invitee: {invite?.invitee_email ?? '—'}</p>
        <button className="primary" onClick={handleAccept}>
          Accept invite
        </button>
      </div>
      <div className="panel-actions">
        <button className="ghost" onClick={onLogin}>
          Login to continue
        </button>
      </div>
    </div>
  )
}
