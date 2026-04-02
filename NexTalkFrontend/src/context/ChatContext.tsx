/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE } from "../lib/constants";
import { useAuth } from "./AuthContext";

type ChatRow = {
  id: number;
  title: string | null;
  is_group: number;
  created_at: string;
  last_message: string | null;
  last_message_at: string | null;
  display_title?: string | null;
};

type MessageRow = {
  id: number;
  body: string;
  created_at: string;
  sender_id: number;
  sender_username: string;
  sender_avatar_url?: string | null;
  chat_id?: number;
};

type ChatContextValue = {
  chats: ChatRow[];
  activeChatId: number | null;
  activeChat: ChatRow | null;
  messages: MessageRow[];
  setActiveChatId: (id: number) => void;
  refreshChats: (targetChatId?: number) => Promise<void>;
  sendMessage: (body: string) => Promise<void>;
  sendFile: (file: File) => Promise<void>;
  sendTyping: (chatId: number, typing: boolean) => void;
  typingUsersByChat: Record<
    number,
    Array<{ senderId: number; senderUsername: string; expires: number }>
  >;
  hasUnread: (chat: ChatRow) => boolean;
  createChat: (payload: {
    title: string;
    memberEmails: string[];
    welcomeMessage: string;
  }) => Promise<number>;
  createDirectChatByMobile: (mobileNumber: string) => Promise<number>;
  addMember: (
    chatId: number,
    email: string,
    welcomeMessage?: string,
  ) => Promise<void>;
  addMobileMember: (
    chatId: number,
    name: string,
    mobileNumber: string,
  ) => Promise<void>;
  deleteChat: (chatId: number) => Promise<void>;
  blockChat: (chatId: number) => Promise<void>;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { token, apiRequest } = useAuth();
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messagesByChat, setMessagesByChat] = useState<
    Record<number, MessageRow[]>
  >({});
  const [typingUsersByChat, setTypingUsersByChat] = useState<
    Record<
      number,
      Array<{ senderId: number; senderUsername: string; expires: number }>
    >
  >({});
  const [readAtByChat, setReadAtByChat] = useState<Record<number, string>>({});
  const socketRef = useRef<Socket | null>(null);

  const isUploadAssetPath = useCallback(
    (body: string) =>
      body.startsWith("/assets/uploads/") ||
      body.startsWith("assets/uploads/") ||
      /^(https?:\/\/[^/]+)?\/assets\/uploads\//.test(body),
    [],
  );

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [activeChatId, chats],
  );

  const messages = useMemo(
    () => (activeChatId ? (messagesByChat[activeChatId] ?? []) : []),
    [activeChatId, messagesByChat],
  );

  useEffect(() => {
    if (!activeChatId) return;
    setReadAtByChat((prev) => ({
      ...prev,
      [activeChatId]: new Date().toISOString(),
    }));
  }, [activeChatId]);

  const hasUnread = useCallback(
    (chat: ChatRow) => {
      if (chat.id === activeChatId) return false;
      if (!chat.last_message_at) return false;
      const lastRead = readAtByChat[chat.id];
      if (!lastRead) return true;
      return new Date(chat.last_message_at) > new Date(lastRead);
    },
    [activeChatId, readAtByChat],
  );

  const refreshChats = useCallback(
    async (targetChatId?: number) => {
      const data = await apiRequest<{ chats: ChatRow[] }>("/api/chats");
      setChats(data.chats);
      if (targetChatId) {
        setActiveChatId(targetChatId);
        socketRef.current?.emit("chat:join", targetChatId);
        return;
      }
      const hasCurrentActive =
        activeChatId !== null &&
        data.chats.some((chat) => chat.id === activeChatId);
      if (!hasCurrentActive) {
        setActiveChatId(data.chats[0]?.id ?? null);
      }
    },
    [activeChatId, apiRequest],
  );

  const sendTyping = useCallback((chatId: number, typing: boolean) => {
    socketRef.current?.emit("typing", chatId, typing);
  }, []);

  const handleTypingEvent = useCallback(
    (payload: {
      chatId: number;
      senderId: number;
      senderUsername: string;
      typing: boolean;
    }) => {
      setTypingUsersByChat((prev) => {
        const existing = prev[payload.chatId] ?? [];
        const next = existing.filter(
          (item) => item.senderId !== payload.senderId,
        );
        if (!payload.typing) {
          return { ...prev, [payload.chatId]: next };
        }
        return {
          ...prev,
          [payload.chatId]: [
            ...next,
            {
              senderId: payload.senderId,
              senderUsername: payload.senderUsername,
              expires: Date.now() + 1600,
            },
          ],
        };
      });
    },
    [],
  );

  const sendMessage = useCallback(
    async (body: string) => {
      if (!activeChatId) return;
      if (!body.trim()) return;

      const data = await apiRequest<{ message: MessageRow }>(
        `/api/chats/${activeChatId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ body }),
        },
      );

      setMessagesByChat((prev) => {
        const existing = prev[activeChatId] ?? [];
        if (existing.some((item) => item.id === data.message.id)) {
          return prev;
        }
        return {
          ...prev,
          [activeChatId]: [...existing, data.message],
        };
      });

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId
            ? {
                ...chat,
                last_message: isUploadAssetPath(data.message.body)
                  ? "[Image]"
                  : data.message.body,
                last_message_at: data.message.created_at,
              }
            : chat,
        ),
      );
    },
    [activeChatId, apiRequest],
  );

  const sendFile = useCallback(
    async (file: File) => {
      if (!activeChatId || !token) return;

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_BASE}/api/chats/${activeChatId}/messages/file`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Request failed");
      }

      setMessagesByChat((prev) => {
        const existing = prev[activeChatId] ?? [];
        if (existing.some((item) => item.id === data.message.id)) {
          return prev;
        }
        return {
          ...prev,
          [activeChatId]: [...existing, data.message],
        };
      });

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId
            ? {
                ...chat,
                last_message: isUploadAssetPath(data.message.body)
                  ? "[Attachment]"
                  : data.message.body,
                last_message_at: data.message.created_at,
              }
            : chat,
        ),
      );
    },
    [activeChatId, token],
  );

  const createChat = useCallback(
    async (payload: {
      title: string;
      memberEmails: string[];
      welcomeMessage: string;
    }) => {
      const data = await apiRequest<{ chatId: number }>("/api/chats", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await refreshChats(data.chatId);
      return data.chatId;
    },
    [apiRequest, refreshChats],
  );

  const createDirectChatByMobile = useCallback(
    async (mobileNumber: string) => {
      const data = await apiRequest<{ chatId: number }>(
        "/api/chats/direct/mobile",
        {
          method: "POST",
          body: JSON.stringify({ mobileNumber }),
        },
      );
      await refreshChats(data.chatId);
      return data.chatId;
    },
    [apiRequest, refreshChats],
  );

  const addMember = useCallback(
    async (chatId: number, email: string, welcomeMessage?: string) => {
      await apiRequest(`/api/chats/${chatId}/members`, {
        method: "POST",
        body: JSON.stringify({ email, welcomeMessage }),
      });
      await refreshChats(chatId);
    },
    [apiRequest, refreshChats],
  );

  const addMobileMember = useCallback(
    async (chatId: number, name: string, mobileNumber: string) => {
      await apiRequest(`/api/chats/${chatId}/mobile-members`, {
        method: "POST",
        body: JSON.stringify({ name, mobileNumber }),
      });
      await refreshChats(chatId);
    },
    [apiRequest, refreshChats],
  );

  const deleteChat = useCallback(
    async (chatId: number) => {
      await apiRequest(`/api/chats/${chatId}`, { method: "DELETE" });
      setMessagesByChat((prev) => {
        const next = { ...prev };
        delete next[chatId];
        return next;
      });
      if (activeChatId === chatId) {
        setActiveChatId(null);
      }
      await refreshChats();
    },
    [activeChatId, apiRequest, refreshChats],
  );

  const blockChat = useCallback(
    async (chatId: number) => {
      await apiRequest(`/api/chats/${chatId}/block`, { method: "POST" });
      setMessagesByChat((prev) => {
        const next = { ...prev };
        delete next[chatId];
        return next;
      });
      if (activeChatId === chatId) {
        setActiveChatId(null);
      }
      await refreshChats();
    },
    [activeChatId, apiRequest, refreshChats],
  );

  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(() => {
      refreshChats().catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [token, refreshChats]);

  useEffect(() => {
    if (!token) return;
    if (!activeChatId) return;

    apiRequest<{ messages: MessageRow[] }>(
      `/api/chats/${activeChatId}/messages`,
    )
      .then((data) => {
        setMessagesByChat((prev) => ({
          ...prev,
          [activeChatId]: data.messages,
        }));
      })
      .catch(() => undefined);
  }, [token, activeChatId, apiRequest]);

  useEffect(() => {
    if (!token) return;

    const socket = io(API_BASE, {
      auth: { token },
    });

    const appendMessage = (message: MessageRow) => {
      if (!message.chat_id) return;
      setMessagesByChat((prev) => {
        const existing = prev[message.chat_id!] ?? [];
        if (existing.some((item) => item.id === message.id)) {
          return prev;
        }
        return {
          ...prev,
          [message.chat_id!]: [...existing, message],
        };
      });
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === message.chat_id
            ? {
                ...chat,
                last_message: isUploadAssetPath(message.body)
                  ? "[Image]"
                  : message.body,
                last_message_at: message.created_at,
              }
            : chat,
        ),
      );
    };

    socket.on("message:new", appendMessage);
    socket.on("typing", handleTypingEvent);

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, handleTypingEvent]);

  const value = useMemo<ChatContextValue>(
    () => ({
      chats,
      activeChatId,
      activeChat,
      messages,
      setActiveChatId,
      refreshChats,
      sendMessage,
      sendFile,
      sendTyping,
      typingUsersByChat,
      hasUnread,
      createChat,
      createDirectChatByMobile,
      addMember,
      addMobileMember,
      deleteChat,
      blockChat,
    }),
    [
      chats,
      activeChatId,
      activeChat,
      messages,
      refreshChats,
      sendMessage,
      sendFile,
      sendTyping,
      typingUsersByChat,
      hasUnread,
      createChat,
      createDirectChatByMobile,
      addMember,
      addMobileMember,
      deleteChat,
      blockChat,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
}
