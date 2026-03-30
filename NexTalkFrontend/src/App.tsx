import { useEffect, useMemo, useState } from 'react'
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

type Chat = {
  id: number
  name: string
  lastMessage: string
  time: string
  unread: number
  status: 'active' | 'online' | 'away' | 'offline'
}

type InviteInfo = {
  id: number
  chat_id: number
  invitee_email: string
  message: string
  status: string
  title: string
}

const chats: Chat[] = [
  {
    id: 1,
    name: 'Product Design Squad',
    lastMessage: 'Sketching out the onboarding flow now.',
    time: '2m',
    unread: 3,
    status: 'active',
  },
  {
    id: 2,
    name: 'Dev Sync',
    lastMessage: 'API is up. Starting frontend wiring.',
    time: '17m',
    unread: 0,
    status: 'online',
  },
  {
    id: 3,
    name: 'Support',
    lastMessage: 'Ticket #482 is now resolved.',
    time: '1h',
    unread: 1,
    status: 'away',
  },
]

const messages = [
  {
    id: 1,
    author: 'Ava',
    role: 'Design Lead',
    body: 'Welcome to NexTalk. Daily sync starts in 5.',
    time: '09:01',
    mine: false,
  },
  {
    id: 2,
    author: 'You',
    role: 'Full Stack',
    body: 'I will share the backend plan and schema.',
    time: '09:02',
    mine: true,
  },
  {
    id: 3,
    author: 'Ava',
    role: 'Design Lead',
    body: 'Great. Can we add typing indicators later?',
    time: '09:03',
    mine: false,
  },
]

const files = [
  { id: 1, name: 'Brand_Guidelines.pdf', size: '4.2 MB' },
  { id: 2, name: 'API_Spec.md', size: '18 KB' },
  { id: 3, name: 'Onboarding_Flow.fig', size: '24 MB' },
]

const calls = [
  { id: 1, name: 'Design Sync', time: 'Today · 10:00', status: 'Upcoming' },
  { id: 2, name: 'Backend Review', time: 'Today · 15:30', status: 'Planned' },
]

const API_BASE = 'http://localhost:4000'

function App() {
  const [activeView, setActiveView] = useState<View>('chat')
  const [activeChatId, setActiveChatId] = useState(1)
  const [toast, setToast] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('nextalk_token'),
  )
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authForm, setAuthForm] = useState({
    username: '',
    email: '',
    password: '',
  })
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)

  const [newChatForm, setNewChatForm] = useState({
    title: '',
    memberEmails: '',
    message: '',
  })

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? chats[0],
    [activeChatId],
  )

  useEffect(() => {
    const match = window.location.pathname.match(/\/invite\/(.+)$/)
    if (match?.[1]) {
      const tokenFromUrl = match[1]
      setInviteToken(tokenFromUrl)
      setActiveView('invite')
    } else if (!token) {
      setActiveView('auth')
    }
  }, [token])

  useEffect(() => {
    if (!inviteToken) return

    fetch(`${API_BASE}/api/invites/${inviteToken}`)
      .then((res) => res.json())
      .then((data) => setInviteInfo(data.invite))
      .catch(() => setInviteInfo(null))
  }, [inviteToken])

  function handleToast(label: string) {
    setToast(label)
    window.setTimeout(() => setToast(null), 1800)
  }

  async function apiRequest(path: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers)
    headers.set('Content-Type', 'application/json')
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error ?? 'Request failed')
    }

    return data
  }

  async function handleAuthSubmit(event: React.FormEvent) {
    event.preventDefault()
    try {
      const payload =
        authMode === 'register'
          ? {
              username: authForm.username,
              email: authForm.email,
              password: authForm.password,
            }
          : {
              email: authForm.email,
              password: authForm.password,
            }

      const data = await apiRequest(`/api/auth/${authMode}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      localStorage.setItem('nextalk_token', data.token)
      setToken(data.token)
      setActiveView('chat')
      handleToast('Welcome to NexTalk')
    } catch (error) {
      handleToast((error as Error).message)
    }
  }

  async function handleCreateChat() {
    try {
      const memberEmails = newChatForm.memberEmails
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean)

      await apiRequest('/api/chats', {
        method: 'POST',
        body: JSON.stringify({
          title: newChatForm.title,
          memberEmails,
          welcomeMessage: newChatForm.message,
        }),
      })

      setNewChatForm({ title: '', memberEmails: '', message: '' })
      setActiveView('chat')
      handleToast('Chat created and invites sent')
    } catch (error) {
      handleToast((error as Error).message)
    }
  }

  async function handleAcceptInvite() {
    if (!inviteToken) return

    if (!token) {
      setActiveView('auth')
      handleToast('Login or register to accept the invite')
      return
    }

    try {
      await apiRequest(`/api/invites/${inviteToken}/accept`, { method: 'POST' })
      setActiveView('chat')
      handleToast('Invite accepted')
    } catch (error) {
      handleToast((error as Error).message)
    }
  }

  async function handleLogout() {
    localStorage.removeItem('nextalk_token')
    setToken(null)
    setActiveView('auth')
  }

  return (
    <div className="app">
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
            <button className="ghost" onClick={handleLogout}>
              Sign out
            </button>
          ) : null}
          <button className="ghost" onClick={() => handleToast('Invite sent')}>
            Invite
          </button>
          <button
            className="ghost"
            onClick={() => handleToast('Share link copied')}
          >
            Share
          </button>
          <button className="primary" onClick={() => setActiveView('new')}>
            New chat
          </button>
        </div>
      </header>

      <div className="shell">
        <aside className="sidebar">
          <div className="user-card">
            <div className="avatar avatar--lg">K</div>
            <div>
              <p className="user-name">Kaif Zaki</p>
              <p className="user-role">Product Owner</p>
            </div>
            <button className="ghost" onClick={() => setActiveView('profile')}>
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

          <div className="section-title">Pinned</div>
          <div className="chat-list">
            {chats.map((chat) => (
              <button
                className={`chat-item ${
                  activeChatId === chat.id ? 'chat-item--active' : ''
                }`}
                key={chat.id}
                onClick={() => {
                  setActiveChatId(chat.id)
                  setActiveView('chat')
                }}
              >
                <div className={`status-dot status-dot--${chat.status}`}></div>
                <div className="avatar">{chat.name[0]}</div>
                <div className="chat-meta">
                  <div className="chat-row">
                    <span className="chat-name">{chat.name}</span>
                    <span className="chat-time">{chat.time}</span>
                  </div>
                  <div className="chat-row">
                    <span className="chat-preview">{chat.lastMessage}</span>
                    {chat.unread > 0 ? (
                      <span className="chat-unread">{chat.unread}</span>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="content">
          {activeView === 'auth' && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <p className="panel-title">
                    {authMode === 'login' ? 'Welcome back' : 'Create your account'}
                  </p>
                  <p className="panel-sub">
                    {authMode === 'login'
                      ? 'Login to continue chatting.'
                      : 'Register to join your team.'}
                  </p>
                </div>
              </div>
              <form className="panel-body" onSubmit={handleAuthSubmit}>
                {authMode === 'register' ? (
                  <label className="field">
                    Username
                    <input
                      value={authForm.username}
                      onChange={(event) =>
                        setAuthForm({
                          ...authForm,
                          username: event.target.value,
                        })
                      }
                      required
                    />
                  </label>
                ) : null}
                <label className="field">
                  Email
                  <input
                    type="email"
                    value={authForm.email}
                    onChange={(event) =>
                      setAuthForm({ ...authForm, email: event.target.value })
                    }
                    required
                  />
                </label>
                <label className="field">
                  Password
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={(event) =>
                      setAuthForm({
                        ...authForm,
                        password: event.target.value,
                      })
                    }
                    required
                  />
                </label>
                <div className="panel-actions panel-actions--split">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() =>
                      setAuthMode(authMode === 'login' ? 'register' : 'login')
                    }
                  >
                    {authMode === 'login'
                      ? 'Create account'
                      : 'Use existing account'}
                  </button>
                  <button type="submit" className="primary">
                    {authMode === 'login' ? 'Login' : 'Register'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeView === 'invite' && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <p className="panel-title">Chat invite</p>
                  <p className="panel-sub">
                    {inviteInfo?.title ?? 'Loading invite...'}
                  </p>
                </div>
              </div>
              <div className="panel-body">
                <p className="invite-message">
                  {inviteInfo?.message ?? 'Fetching invite details.'}
                </p>
                <p className="invite-meta">
                  Invitee: {inviteInfo?.invitee_email ?? '—'}
                </p>
                <button className="primary" onClick={handleAcceptInvite}>
                  Accept invite
                </button>
              </div>
              <div className="panel-actions">
                <button className="ghost" onClick={() => setActiveView('auth')}>
                  Login to continue
                </button>
              </div>
            </div>
          )}

          {activeView === 'chat' && (
            <div className="chat">
              <header className="chat-header">
                <div>
                  <p className="chat-title">{activeChat.name}</p>
                  <p className="chat-sub">8 members · 3 online</p>
                </div>
                <div className="chat-actions">
                  <button
                    className="ghost"
                    onClick={() => setActiveView('files')}
                  >
                    Files
                  </button>
                  <button
                    className="ghost"
                    onClick={() => setActiveView('calls')}
                  >
                    Call
                  </button>
                  <button
                    className="ghost"
                    onClick={() => setActiveView('details')}
                  >
                    Details
                  </button>
                </div>
              </header>

              <section className="chat-body">
                <div className="day-divider">Today</div>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${message.mine ? 'message--mine' : ''}`}
                  >
                    <div className="message-bubble">
                      <p className="message-author">{message.author}</p>
                      <p className="message-role">{message.role}</p>
                      <p className="message-text">{message.body}</p>
                    </div>
                    <span className="message-time">{message.time}</span>
                  </div>
                ))}
              </section>

              <footer className="composer">
                <div className="composer-input">
                  <input placeholder="Write a message" />
                  <div className="composer-actions">
                    <button
                      className="ghost"
                      onClick={() => handleToast('Attachment added')}
                    >
                      Attach
                    </button>
                    <button
                      className="ghost"
                      onClick={() => handleToast('Emoji picker')}
                    >
                      Emoji
                    </button>
                    <button
                      className="ghost"
                      onClick={() => handleToast('GIF picker')}
                    >
                      GIF
                    </button>
                  </div>
                </div>
                <button
                  className="primary"
                  onClick={() => handleToast('Message sent')}
                >
                  Send
                </button>
              </footer>
            </div>
          )}

          {activeView === 'new' && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <p className="panel-title">Create a new chat</p>
                  <p className="panel-sub">
                    Add member emails and send an invite message.
                  </p>
                </div>
                <button className="ghost" onClick={() => setActiveView('chat')}>
                  Back to chat
                </button>
              </div>
              <div className="panel-body">
                <label className="field">
                  Chat title
                  <input
                    value={newChatForm.title}
                    onChange={(event) =>
                      setNewChatForm({
                        ...newChatForm,
                        title: event.target.value,
                      })
                    }
                    placeholder="e.g. Project Phoenix"
                  />
                </label>
                <label className="field">
                  Member emails (comma separated)
                  <input
                    value={newChatForm.memberEmails}
                    onChange={(event) =>
                      setNewChatForm({
                        ...newChatForm,
                        memberEmails: event.target.value,
                      })
                    }
                    placeholder="sam@team.com, alex@team.com"
                  />
                </label>
                <label className="field">
                  Invite message
                  <input
                    value={newChatForm.message}
                    onChange={(event) =>
                      setNewChatForm({
                        ...newChatForm,
                        message: event.target.value,
                      })
                    }
                    placeholder="Say hello to the team"
                  />
                </label>
              </div>
              <div className="panel-actions">
                <button className="ghost" onClick={() => setActiveView('chat')}>
                  Cancel
                </button>
                <button className="primary" onClick={handleCreateChat}>
                  Create chat
                </button>
              </div>
            </div>
          )}

          {activeView === 'profile' && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <p className="panel-title">Profile</p>
                  <p className="panel-sub">Manage your account details.</p>
                </div>
                <button className="ghost" onClick={() => setActiveView('chat')}>
                  Back to chat
                </button>
              </div>
              <div className="panel-body panel-grid">
                <div className="profile-card">
                  <div className="avatar avatar--xl">K</div>
                  <div>
                    <p className="user-name">Kaif Zaki</p>
                    <p className="user-role">Product Owner</p>
                  </div>
                  <button
                    className="ghost"
                    onClick={() => handleToast('Avatar updated')}
                  >
                    Change photo
                  </button>
                </div>
                <div className="profile-info">
                  <label className="field">
                    Full name
                    <input defaultValue="Kaif Zaki" />
                  </label>
                  <label className="field">
                    Email
                    <input defaultValue="kaif@nextalk.io" />
                  </label>
                  <label className="field">
                    Status
                    <input defaultValue="Building NexTalk" />
                  </label>
                </div>
              </div>
              <div className="panel-actions">
                <button
                  className="ghost"
                  onClick={() => handleToast('Changes discarded')}
                >
                  Discard
                </button>
                <button
                  className="primary"
                  onClick={() => handleToast('Profile saved')}
                >
                  Save changes
                </button>
              </div>
            </div>
          )}

          {activeView === 'files' && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <p className="panel-title">Shared files</p>
                  <p className="panel-sub">Everything in this chat, organized.</p>
                </div>
                <button className="ghost" onClick={() => setActiveView('chat')}>
                  Back to chat
                </button>
              </div>
              <div className="panel-body">
                <div className="file-grid">
                  {files.map((file) => (
                    <div key={file.id} className="file-card">
                      <div>
                        <p className="file-name">{file.name}</p>
                        <p className="file-size">{file.size}</p>
                      </div>
                      <button
                        className="ghost"
                        onClick={() => handleToast('File opened')}
                      >
                        Open
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel-actions">
                <button
                  className="ghost"
                  onClick={() => handleToast('Upload started')}
                >
                  Upload
                </button>
                <button
                  className="primary"
                  onClick={() => handleToast('Folder created')}
                >
                  New folder
                </button>
              </div>
            </div>
          )}

          {activeView === 'calls' && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <p className="panel-title">Calls & meetings</p>
                  <p className="panel-sub">Jump into your next session.</p>
                </div>
                <button className="ghost" onClick={() => setActiveView('chat')}>
                  Back to chat
                </button>
              </div>
              <div className="panel-body">
                <div className="call-list">
                  {calls.map((call) => (
                    <div key={call.id} className="call-card">
                      <div>
                        <p className="call-name">{call.name}</p>
                        <p className="call-time">{call.time}</p>
                      </div>
                      <button
                        className="primary"
                        onClick={() => handleToast('Joining call')}
                      >
                        {call.status}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel-actions">
                <button className="ghost" onClick={() => handleToast('Scheduled')}>
                  Schedule
                </button>
                <button
                  className="primary"
                  onClick={() => handleToast('Call started')}
                >
                  Start call
                </button>
              </div>
            </div>
          )}

          {activeView === 'details' && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <p className="panel-title">Chat details</p>
                  <p className="panel-sub">Quick snapshot and next actions.</p>
                </div>
                <button className="ghost" onClick={() => setActiveView('chat')}>
                  Back to chat
                </button>
              </div>
              <div className="panel-body details-grid">
                <div className="details-card">
                  <p className="section-title">Team snapshot</p>
                  <div className="metrics">
                    <div>
                      <p className="metric-value">8</p>
                      <p className="metric-label">Members</p>
                    </div>
                    <div>
                      <p className="metric-value">3</p>
                      <p className="metric-label">Online</p>
                    </div>
                    <div>
                      <p className="metric-value">12</p>
                      <p className="metric-label">Files</p>
                    </div>
                  </div>
                </div>
                <div className="details-card">
                  <p className="section-title">Next actions</p>
                  <ul className="task-list">
                    <li>Finalize schema migration</li>
                    <li>Review onboarding copy</li>
                    <li>Confirm launch checklist</li>
                  </ul>
                  <button
                    className="primary"
                    onClick={() => handleToast('Task created')}
                  >
                    Create task
                  </button>
                </div>
              </div>
              <div className="panel-actions">
                <button className="ghost" onClick={() => handleToast('Pinned')}>
                  Pin chat
                </button>
                <button
                  className="primary"
                  onClick={() => handleToast('Settings opened')}
                >
                  Settings
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <nav className="mobile-nav">
        <button
          className={`pill ${activeView === 'chat' ? 'pill--active' : ''}`}
          onClick={() => setActiveView('chat')}
        >
          Chats
        </button>
        <button
          className={`pill ${activeView === 'files' ? 'pill--active' : ''}`}
          onClick={() => setActiveView('files')}
        >
          Files
        </button>
        <button
          className={`pill ${activeView === 'calls' ? 'pill--active' : ''}`}
          onClick={() => setActiveView('calls')}
        >
          Calls
        </button>
        <button
          className={`pill ${activeView === 'profile' ? 'pill--active' : ''}`}
          onClick={() => setActiveView('profile')}
        >
          Profile
        </button>
      </nav>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}

export default App
