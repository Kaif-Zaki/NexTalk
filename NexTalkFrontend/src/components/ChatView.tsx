import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import { useToast } from '../context/ToastContext'
import { formatTime } from '../lib/time'
import { API_BASE } from '../lib/constants'

type ChatViewProps = {
  onFiles: () => void
  onCalls: () => void
  onDetails: () => void
}

export function ChatView({ onFiles, onCalls, onDetails }: ChatViewProps) {
  const { user } = useAuth()
  const { activeChat, messages, sendMessage, deleteChat, blockChat } = useChat()
  const { notify } = useToast()
  const [draft, setDraft] = useState('')

  async function handleSend() {
    if (!draft.trim()) return
    await sendMessage(draft.trim())
    setDraft('')
  }

  async function handleDeleteChat() {
    if (!activeChat) return
    const ok = window.confirm(
      activeChat.is_group ? 'Leave this chat?' : 'Delete this chat?',
    )
    if (!ok) return
    try {
      await deleteChat(activeChat.id)
      notify(activeChat.is_group ? 'Left chat' : 'Chat deleted')
    } catch (error) {
      notify((error as Error).message)
    }
  }

  async function handleBlockUser() {
    if (!activeChat || activeChat.is_group) return
    const ok = window.confirm('Block this user?')
    if (!ok) return
    try {
      await blockChat(activeChat.id)
      notify('User blocked')
    } catch (error) {
      notify((error as Error).message)
    }
  }

  return (
    <div className="chat">
      <header className="chat-header">
        <div>
          <p className="chat-title">{activeChat?.title ?? 'Select a chat'}</p>
          <p className="chat-sub">Realtime NexTalk</p>
        </div>
        <div className="chat-actions">
          <button className="ghost" onClick={onFiles}>
            Files
          </button>
          <button className="ghost" onClick={onCalls}>
            Call
          </button>
          <button className="ghost" onClick={onDetails}>
            Details
          </button>
          {activeChat && (
            <>
              <button className="ghost" onClick={handleDeleteChat}>
                {activeChat.is_group ? 'Leave' : 'Delete'}
              </button>
              {!activeChat.is_group && (
                <button className="ghost" onClick={handleBlockUser}>
                  Block
                </button>
              )}
            </>
          )}
        </div>
      </header>

      <section className="chat-body">
        {messages.length === 0 ? (
          <div className="empty-state">No messages yet.</div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message ${
                message.sender_id === user?.id ? 'message--mine' : ''
              }`}
            >
              <div className="message-avatar">
                {message.sender_avatar_url ? (
                  <img
                    src={`${API_BASE}${message.sender_avatar_url}`}
                    alt={message.sender_username}
                  />
                ) : (
                  message.sender_username?.[0]?.toUpperCase() ?? 'U'
                )}
              </div>
              <div className="message-bubble">
                <p className="message-author">{message.sender_username}</p>
                <p className="message-text">{message.body}</p>
              </div>
              <span className="message-time">
                {formatTime(message.created_at)}
              </span>
            </div>
          ))
        )}
      </section>

      <footer className="composer">
        <div className="composer-input">
          <input
            placeholder="Write a message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="composer-actions">
            <button className="ghost" onClick={() => notify('Attachment added')}>
              Attach
            </button>
            <button className="ghost" onClick={() => notify('Emoji picker')}>
              Emoji
            </button>
            <button className="ghost" onClick={() => notify('GIF picker')}>
              GIF
            </button>
          </div>
        </div>
        <button className="primary" onClick={handleSend}>
          Send
        </button>
      </footer>
    </div>
  )
}
