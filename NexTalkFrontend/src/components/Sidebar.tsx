import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { formatTime } from "../lib/time";
import { API_BASE } from "../lib/constants";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  onProfile: () => void;
  onNewChat: () => void;
  onDirectChat: () => void;
  onAddMember: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onLogout: () => void;
};

export function Sidebar({
  open,
  onClose,
  onProfile,
  onNewChat,
  onDirectChat,
  onAddMember,
  theme,
  onToggleTheme,
  onLogout,
}: SidebarProps) {
  const { user } = useAuth();
  const { chats, activeChatId, setActiveChatId, hasUnread } = useChat();
  const [query, setQuery] = useState("");

  const filteredChats = useMemo(
    () =>
      chats.filter((chat) => {
        const label = (chat.display_title ?? chat.title ?? "").toLowerCase();
        return label.includes(query.toLowerCase());
      }),
    [chats, query],
  );

  const channelChats = useMemo(
    () => filteredChats.filter((chat) => chat.is_group === 1),
    [filteredChats],
  );

  const directChats = useMemo(
    () => filteredChats.filter((chat) => chat.is_group === 0),
    [filteredChats],
  );

  function handlePickChat(chatId: number) {
    setActiveChatId(chatId);
    onClose();
  }

  function renderChatList(items: typeof chats) {
    return items.map((chat) => (
      <li key={chat.id}>
        <button
          className={`room-item ${activeChatId === chat.id ? "is-active" : ""}`}
          onClick={() => handlePickChat(chat.id)}
        >
          <span className="room-hash">#</span>
          <span className="room-name">
            {chat.display_title ?? chat.title ?? `chat-${chat.id}`}
          </span>
          {hasUnread(chat) ? <span className="room-unread">1</span> : null}
        </button>
        <p className="room-preview">
          {chat.last_message ?? "No messages yet"} ·{" "}
          {formatTime(chat.last_message_at) || formatTime(chat.created_at)}
        </p>
      </li>
    ));
  }

  return (
    <>
      <div
        className={`sidebar-overlay ${open ? "is-open" : ""}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <header className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          <p className="sidebar-logo-text">NexTalk</p>
        </header>

        <div className="sidebar-search-wrap">
          <div className="sidebar-search">
            <span className="sidebar-search-icon">⌕</span>
            <input
              placeholder="Search rooms..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="sidebar-section sidebar-section--actions">
          <div className="sidebar-section-head">
            <p>Quick actions</p>
          </div>
          <div className="sidebar-quick-actions">
            <button className="section-add-btn" onClick={onNewChat}>
              + Channel
            </button>
            <button
              className="section-add-btn secondary"
              onClick={onDirectChat}
            >
              + Direct Chat
            </button>
            <button className="section-add-btn secondary" onClick={onAddMember}>
              + Add Member
            </button>
          </div>
        </div>

        <div className="sidebar-section sidebar-section--rooms">
          <div className="sidebar-section-head">
            <p>Conversations</p>
          </div>

          <ul className="room-list">
            {filteredChats.length === 0 ? (
              <li className="room-empty">No chats found</li>
            ) : (
              <>
                {channelChats.length > 0 && (
                  <li className="room-group">
                    <div className="room-group-label">Channels</div>
                    <ul className="room-group-list">
                      {renderChatList(channelChats)}
                    </ul>
                  </li>
                )}
                {directChats.length > 0 && (
                  <li className="room-group">
                    <div className="room-group-label">Direct Chats</div>
                    <ul className="room-group-list">
                      {renderChatList(directChats)}
                    </ul>
                  </li>
                )}
              </>
            )}
          </ul>
        </div>

        <footer className="sidebar-user">
          <button className="sidebar-user-main" onClick={onProfile}>
            <span className="avatar avatar--lg has-status">
              {user?.avatarUrl ? (
                <img src={`${API_BASE}${user.avatarUrl}`} alt={user.username} />
              ) : (
                (user?.username?.[0]?.toUpperCase() ?? "U")
              )}
              <span className="status-live" />
            </span>
            <span>
              <span className="user-name">{user?.username ?? "Guest"}</span>
              <span className="user-role">{user?.email ?? "offline"}</span>
            </span>
          </button>
          <button
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label="toggle-theme"
          >
            {theme === "light" ? "🌙" : "☀"}
          </button>
          <button
            className="icon-btn danger"
            onClick={onLogout}
            aria-label="logout"
          >
            ⎋
          </button>
        </footer>
      </aside>
    </>
  );
}
