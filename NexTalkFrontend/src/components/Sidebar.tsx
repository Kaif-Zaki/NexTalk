import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import { formatTime } from '../lib/time'

type SidebarProps = {
  onProfile: () => void
}

export function Sidebar({ onProfile }: SidebarProps) {
  const { user } = useAuth()
  const { chats, activeChatId, setActiveChatId } = useChat()

  return (
    <aside className="sidebar">
      <div className="user-card">
        <div className="avatar avatar--lg">{user?.username?.[0] ?? 'K'}</div>
        <div>
          <p className="user-name">{user?.username ?? 'Guest'}</p>
          <p className="user-role">{user?.email ?? 'Sign in to chat'}</p>
        </div>
        <button className="ghost" onClick={onProfile}>
          Profile
        </button>
      </div>

      <div className="search">
        <input placeholder="Search chats, files, people" />
        <span className="kbd">CTRL + K</span>
      </div>

      <div className="pill-row">
        <button className="pill pill--active">All</button>
        <button className="pill">Unread</button>
        <button className="pill">Groups</button>
      </div>

      <div className="section-title">Chats</div>
      <div className="chat-list">
        {chats.length === 0 ? (
          <div className="empty-state">No chats yet.</div>
        ) : (
          chats.map((chat) => (
            <button
              className={`chat-item ${
                activeChatId === chat.id ? 'chat-item--active' : ''
              }`}
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
            >
              <div className="status-dot status-dot--online"></div>
              <div className="avatar">
                {(chat.title ?? 'C')[0].toUpperCase()}
              </div>
              <div className="chat-meta">
                <div className="chat-row">
                  <span className="chat-name">
                    {chat.title ?? `Chat #${chat.id}`}
                  </span>
                  <span className="chat-time">
                    {formatTime(chat.last_message_at) ||
                      formatTime(chat.created_at)}
                  </span>
                </div>
                <div className="chat-row">
                  <span className="chat-preview">
                    {chat.last_message ?? 'No messages yet'}
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  )
}
