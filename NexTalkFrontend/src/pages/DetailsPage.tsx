import { useChat } from '../context/ChatContext'
import { useToast } from '../context/ToastContext'
import { useState } from 'react'

type DetailsPageProps = {
  onBack: () => void
}

export function DetailsPage({ onBack }: DetailsPageProps) {
  const { activeChat, deleteChat, blockChat, addMember } = useChat()
  const { notify } = useToast()
  const [memberEmail, setMemberEmail] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [adding, setAdding] = useState(false)

  const chatName = activeChat?.display_title ?? activeChat?.title ?? 'this chat'
  const isGroup = (activeChat?.is_group ?? 0) === 1

  async function handleDelete() {
    if (!activeChat) return
    try {
      await deleteChat(activeChat.id)
      notify(isGroup ? 'Left the chat' : 'Chat deleted')
      onBack()
    } catch (error) {
      notify((error as Error).message)
    }
  }

  async function handleBlock() {
    if (!activeChat) return
    try {
      await blockChat(activeChat.id)
      notify(`Blocked ${chatName}`)
      onBack()
    } catch (error) {
      notify((error as Error).message)
    }
  }

  async function handleAddMember() {
    if (!activeChat) return
    if (!memberEmail.trim()) {
      notify('Enter member email')
      return
    }
    try {
      setAdding(true)
      await addMember(activeChat.id, memberEmail.trim(), inviteMessage.trim())
      notify('Member added and invite sent')
      setMemberEmail('')
      setInviteMessage('')
    } catch (error) {
      notify((error as Error).message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-title">Chat details</p>
          <p className="panel-sub">Quick snapshot and next actions.</p>
        </div>
        <button className="ghost" onClick={onBack}>
          Back to chat
        </button>
      </div>
      <div className="panel-body details-grid">
        <div className="details-card">
          <div className="details-stack">
            <p className="section-title">Add Member</p>
            <label className="field">
              Member email
              <input
                type="email"
                value={memberEmail}
                onChange={(event) => setMemberEmail(event.target.value)}
                placeholder="alex@team.com"
              />
            </label>
            <label className="field">
              Invite message (optional)
              <input
                value={inviteMessage}
                onChange={(event) => setInviteMessage(event.target.value)}
                placeholder="Join our chat on NexTalk"
              />
            </label>
            <button className="primary" onClick={handleAddMember} disabled={adding}>
              {adding ? <span className="btn-spinner" /> : 'Add member'}
            </button>
          </div>
        </div>
        <div className="details-card">
          <p className="section-title">Chat actions</p>
          <p className="panel-sub">Manage this conversation.</p>
          <button className="primary" onClick={handleDelete}>
            {isGroup ? 'Leave chat' : 'Delete chat'}
          </button>
        </div>
      </div>
      <div className="panel-actions">
        <button className="ghost" onClick={onBack}>
          Cancel
        </button>
        {!isGroup && (
          <button className="primary" onClick={handleBlock}>
            Block user
          </button>
        )}
      </div>
    </div>
  )
}
