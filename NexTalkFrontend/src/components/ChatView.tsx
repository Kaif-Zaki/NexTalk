import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { useToast } from "../context/ToastContext";
import { formatTime } from "../lib/time";
import { API_BASE } from "../lib/constants";

type ChatViewProps = {
  onFiles: () => void;
  onCalls: () => void;
  onDetails: () => void;
  onMenuToggle: () => void;
};

type MessageGroup = {
  senderId: number;
  senderUsername: string;
  senderAvatarUrl: string | null;
  items: Array<{
    id: number;
    body: string;
    created_at: string;
  }>;
};

export function ChatView({
  onFiles,
  onCalls,
  onDetails,
  onMenuToggle,
}: ChatViewProps) {
  const { user } = useAuth();
  const {
    activeChat,
    messages,
    sendMessage,
    sendFile,
    deleteChat,
    blockChat,
    sendTyping,
    typingUsersByChat,
  } = useChat();
  const { notify } = useToast();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [roomSwitchKey, setRoomSwitchKey] = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(
    null,
  );

  const typingUsers = useMemo(() => {
    if (!activeChat) return [];
    const list = typingUsersByChat[activeChat.id] ?? [];
    const now = Date.now();
    return list.filter((item) => item.expires > now);
  }, [activeChat, typingUsersByChat]);

  const messageGroups = useMemo<MessageGroup[]>(() => {
    const groups: MessageGroup[] = [];
    for (const message of messages) {
      const last = groups[groups.length - 1];
      if (last && last.senderId === message.sender_id) {
        last.items.push({
          id: message.id,
          body: message.body,
          created_at: message.created_at,
        });
      } else {
        groups.push({
          senderId: message.sender_id,
          senderUsername: message.sender_username,
          senderAvatarUrl: message.sender_avatar_url ?? null,
          items: [
            {
              id: message.id,
              body: message.body,
              created_at: message.created_at,
            },
          ],
        });
      }
    }
    return groups;
  }, [messages]);

  useEffect(() => {
    setRoomSwitchKey((prev) => prev + 1);
  }, [activeChat?.id]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    const next = Math.min(textarea.scrollHeight, 130);
    textarea.style.height = `${next}px`;
  }, [draft]);

  useEffect(() => {
    if (!activeChat) return;
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    const isTyping = draft.trim().length > 0;
    sendTyping(activeChat.id, isTyping);

    if (isTyping) {
      typingTimeoutRef.current = window.setTimeout(() => {
        sendTyping(activeChat.id, false);
        typingTimeoutRef.current = null;
      }, 1200);
    }

    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [draft, activeChat?.id, sendTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (activeChat) {
        sendTyping(activeChat.id, false);
      }
    };
  }, [activeChat, sendTyping]);

  function insertAtCursor(value: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setDraft((prev) => prev + value);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextDraft = `${draft.slice(0, start)}${value}${draft.slice(end)}`;
    setDraft(nextDraft);
    window.requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + value.length;
      textarea.selectionStart = cursor;
      textarea.selectionEnd = cursor;
    });
  }

  function handleEmojiClick(emoji: string) {
    insertAtCursor(emoji);
    setEmojiPickerOpen(false);
  }

  function handleAttachClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!activeChat) {
      notify("Select a chat first");
      return;
    }

    try {
      setSending(true);
      await sendFile(file);
      notify(`Sent attachment: ${file.name}`);
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function handleSend() {
    if (!draft.trim() || sending) return;
    try {
      setSending(true);
      await sendMessage(draft.trim());
      setDraft("");
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setSending(false);
      if (activeChat) {
        sendTyping(activeChat.id, false);
      }
    }
  }

  async function handleDeleteChat() {
    if (!activeChat) return;
    const ok = window.confirm(
      activeChat.is_group ? "Leave this chat?" : "Delete this chat?",
    );
    if (!ok) return;
    try {
      await deleteChat(activeChat.id);
      notify(activeChat.is_group ? "Left chat" : "Chat deleted");
    } catch (error) {
      notify((error as Error).message);
    }
  }

  async function handleBlockUser() {
    if (!activeChat || activeChat.is_group) return;
    const ok = window.confirm("Block this user?");
    if (!ok) return;
    try {
      await blockChat(activeChat.id);
      notify("User blocked");
    } catch (error) {
      notify((error as Error).message);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  const isAttachmentPath = (body: string) =>
    body.startsWith("/assets/uploads/");

  const isImagePath = (body: string) =>
    body.startsWith("data:image/") ||
    /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(body);

  const getAttachmentName = (body: string) => body.split("/").pop() ?? body;

  return (
    <div className="chat">
      <header className="chat-header">
        <div className="chat-header-left">
          <button className="menu-btn" onClick={onMenuToggle} aria-label="menu">
            ☰
          </button>
          <span className="room-hash">#</span>
          <div>
            <p className="chat-title">
              {activeChat?.display_title ?? activeChat?.title ?? "Select room"}
            </p>
            <p className="chat-sub">
              {activeChat ? "2 members" : "No room selected"}
            </p>
          </div>
        </div>
        <div className="chat-actions">
          <button className="icon-btn" onClick={onFiles} aria-label="search">
            ⌕
          </button>
          <button className="icon-btn" onClick={onCalls} aria-label="members">
            ◉
          </button>
          <button
            className="icon-btn"
            onClick={onDetails}
            aria-label="settings"
          >
            ⚙
          </button>
          {activeChat && (
            <>
              <button
                className="icon-btn"
                onClick={handleDeleteChat}
                aria-label="delete"
              >
                ⌫
              </button>
              {!activeChat.is_group && (
                <button
                  className="icon-btn danger"
                  onClick={handleBlockUser}
                  aria-label="block"
                >
                  ⛔
                </button>
              )}
            </>
          )}
        </div>
      </header>

      <section className="chat-body" key={roomSwitchKey}>
        <div className="date-divider">
          <span>Today</span>
        </div>
        {messageGroups.length === 0 ? (
          <div className="empty-state">
            No messages yet. Start the conversation.
          </div>
        ) : (
          messageGroups.map((group) => {
            const mine = group.senderId === user?.id;
            return (
              <div
                key={`${group.senderId}-${group.items[0]?.id}`}
                className={`message-group ${mine ? "mine" : "theirs"}`}
              >
                {!mine && (
                  <div className="group-avatar">
                    {group.senderAvatarUrl ? (
                      <img
                        src={`${API_BASE}${group.senderAvatarUrl}`}
                        alt={group.senderUsername}
                      />
                    ) : (
                      (group.senderUsername[0]?.toUpperCase() ?? "U")
                    )}
                  </div>
                )}
                <div className="group-content">
                  {!mine && (
                    <p className="message-author">{group.senderUsername}</p>
                  )}
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className={`message-row ${mine ? "mine" : "theirs"}`}
                    >
                      <div className="message-bubble">
                        {isImagePath(item.body) ? (
                          <img
                            className="message-image"
                            src={
                              item.body.startsWith("/assets/uploads/")
                                ? `${API_BASE}${item.body}`
                                : item.body
                            }
                            alt={getAttachmentName(item.body)}
                          />
                        ) : isAttachmentPath(item.body) ? (
                          <a
                            className="message-file-link"
                            href={`${API_BASE}${item.body}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            download={getAttachmentName(item.body)}
                          >
                            📎 {getAttachmentName(item.body)}
                          </a>
                        ) : (
                          <p className="message-text">{item.body}</p>
                        )}
                        <span className="message-time">
                          {formatTime(item.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </section>

      {typingUsers.length > 0 && (
        <div className="typing-indicator is-visible">
          <div className="typing-dots">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
          <span>
            {typingUsers.length === 1
              ? `${typingUsers[0].senderUsername} is typing...`
              : `${typingUsers.map((item) => item.senderUsername).join(", ")} are typing...`}
          </span>
        </div>
      )}

      <footer className="chat-input-wrap">
        <div className="input-shell">
          <input
            ref={fileInputRef}
            type="file"
            accept="*/*"
            className="hidden-input"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            className="icon-btn"
            onClick={handleAttachClick}
            aria-label="attach"
          >
            +
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setEmojiPickerOpen((prev) => !prev)}
            aria-label="emoji"
          >
            ☺
          </button>
          {emojiPickerOpen && (
            <div className="emoji-picker">
              {["😀", "😄", "😎", "😍", "👍", "🎉", "🔥", "😢", "💬", "❤️"].map(
                (emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="emoji-button"
                    onClick={() => handleEmojiClick(emoji)}
                  >
                    {emoji}
                  </button>
                ),
              )}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message..."
            rows={1}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={sending || !draft.trim()}
          >
            {sending ? <span className="btn-spinner" /> : <span>➤</span>}
          </button>
        </div>
      </footer>
    </div>
  );
}
