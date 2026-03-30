import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import type { Socket } from 'socket.io'
import type { RowDataPacket } from 'mysql2/promise'
import { verifyToken } from './auth'
import { env } from './env'
import { pool } from './db'

let io: Server | null = null

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token || typeof token !== 'string') {
      return next(new Error('Unauthorized'))
    }

    try {
      const payload = verifyToken(token)
      socket.data.user = payload
      return next()
    } catch (error) {
      return next(new Error('Unauthorized'))
    }
  })

  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user as { sub: number; username: string }
    socket.join(`user:${user.sub}`)

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT chat_id FROM chat_members WHERE user_id = ?',
      [user.sub],
    )
    rows.forEach((row) => {
      const chatId = row.chat_id as number
      socket.join(`chat:${chatId}`)
    })

    socket.on('chat:join', async (chatId: number) => {
      if (!Number.isFinite(chatId)) return
      const [membership] = await pool.query<RowDataPacket[]>(
        'SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ? LIMIT 1',
        [chatId, user.sub],
      )
      if (membership.length > 0) {
        socket.join(`chat:${chatId}`)
      }
    })
  })

  return io
}

export function emitToChat(chatId: number, event: string, payload: unknown) {
  io?.to(`chat:${chatId}`).emit(event, payload)
}
