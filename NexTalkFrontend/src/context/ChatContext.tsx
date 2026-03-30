import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { API_BASE } from '../lib/constants'
import { useAuth } from './AuthContext'

type ChatRow = {
  id: number
  title: string | null
  is_group: number
  created_at: string
  last_message: string | null
  last_message_at: string | null
}

type MessageRow = {
  id: number
  body: string
  created_at: string
  sender_id: number
  sender_username: string
  chat_id?: number
}

type ChatContextValue = {
  chats: ChatRow[]
  activeChatId: number | null
  activeChat: ChatRow | null
  messages: MessageRow[]
  setActiveChatId: (id: number) => void
  refreshChats: (targetChatId?: number) => Promise<void>
  sendMessage: (body: string) => Promise<void>
  createChat: (payload: {
    title: string
    memberEmails: string[]
    welcomeMessage: string
  }) => Promise<number>
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { token, apiRequest } = useAuth()
  const [chats, setChats] = useState<ChatRow[]>([])
  const [activeChatId, setActiveChatId] = useState<number | null>(null)
  const [messagesByChat, setMessagesByChat] = useState<
    Record<number, MessageRow[]>
  >({})
  const socketRef = useRef<Socket | null>(null)

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [activeChatId, chats],
  )

  const messages = activeChatId ? messagesByChat[activeChatId] ?? [] : []

  useEffect(() => {
    if (!token) {
      setChats([])
      setMessagesByChat({})
      setActiveChatId(null)
      return
    }

    refreshChats().catch(() => undefined)
  }, [token])

  useEffect(() => {
    if (!token) return
    if (!activeChatId) return

    apiRequest<{ messages: MessageRow[] }>(`/api/chats/${activeChatId}/messages`)
      .then((data) => {
        setMessagesByChat((prev) => ({
          ...prev,
          [activeChatId]: data.messages,
        }))
      })
      .catch(() => undefined)
  }, [token, activeChatId])

  useEffect(() => {
    if (!token) return

    const socket = io(API_BASE, {
      auth: { token },
    })

    const appendMessage = (message: MessageRow) => {
      if (!message.chat_id) return
      setMessagesByChat((prev) => {
        const existing = prev[message.chat_id!] ?? []
        if (existing.some((item) => item.id === message.id)) {
          return prev
        }
        return {
          ...prev,
          [message.chat_id!]: [...existing, message],
        }
      })
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === message.chat_id
            ? {
                ...chat,
                last_message: message.body,
                last_message_at: message.created_at,
              }
            : chat,
        ),
      )
    }

    socket.on('message:new', appendMessage)

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  async function refreshChats(targetChatId?: number) {
    const data = await apiRequest<{ chats: ChatRow[] }>('/api/chats')
    setChats(data.chats)
    if (targetChatId) {
      setActiveChatId(targetChatId)
      socketRef.current?.emit('chat:join', targetChatId)
    } else if (!activeChatId && data.chats.length > 0) {
      setActiveChatId(data.chats[0].id)
    }
  }

  async function sendMessage(body: string) {
    if (!activeChatId) return
    if (!body.trim()) return

    const data = await apiRequest<{ message: MessageRow }>(
      `/api/chats/${activeChatId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ body }),
      },
    )

    setMessagesByChat((prev) => {
      const existing = prev[activeChatId] ?? []
      if (existing.some((item) => item.id === data.message.id)) {
        return prev
      }
      return {
        ...prev,
        [activeChatId]: [...existing, data.message],
      }
    })

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? {
              ...chat,
              last_message: data.message.body,
              last_message_at: data.message.created_at,
            }
          : chat,
      ),
    )
  }

  async function createChat(payload: {
    title: string
    memberEmails: string[]
    welcomeMessage: string
  }) {
    const data = await apiRequest<{ chatId: number }>('/api/chats', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    await refreshChats(data.chatId)
    return data.chatId
  }

  const value = useMemo<ChatContextValue>(
    () => ({
      chats,
      activeChatId,
      activeChat,
      messages,
      setActiveChatId,
      refreshChats,
      sendMessage,
      createChat,
    }),
    [chats, activeChatId, activeChat, messages],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within ChatProvider')
  }
  return context
}
