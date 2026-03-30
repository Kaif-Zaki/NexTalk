import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import { useToast } from '../context/ToastContext'
import { formatTime } from '../lib/time'

type ChatViewProps = {
  onFiles: () => void
  onCalls: () => void
  onDetails: () => void
}

export function ChatView({ onFiles, onCalls, onDetails }: ChatViewProps) {
  const { user } = useAuth()
  const { activeChat, messages, sendMessage } = useChat()
  const { notify } = useToast()
  const [draft, setDraft] = useState('')

  async function handleSend() {
    if (!draft.trim()) return
    await sendMessage(draft.trim())
    setDraft('')
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
