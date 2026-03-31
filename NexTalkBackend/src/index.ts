import express from 'express'
import cors from 'cors'
import http from 'http'
import path from 'path'
import authRoutes from './routes/auth'
import chatRoutes from './routes/chats'
import messageRoutes from './routes/messages'
import inviteRoutes from './routes/invites'
import userRoutes from './routes/users'
import { env, warnIfInsecureEnv } from './env'
import { healthcheck } from './db'
import { initSocket } from './socket'

warnIfInsecureEnv()

const app = express()
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
app.use(express.json({ limit: '2mb' }))

const assetsPath = path.resolve(__dirname, '..', 'assets')
app.use('/assets', express.static(assetsPath))

app.get('/health', async (_req, res) => {
  try {
    await healthcheck()
    return res.json({ status: 'ok' })
  } catch (error) {
    return res.status(500).json({ status: 'db-error' })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/chats', chatRoutes)
app.use('/api/chats', messageRoutes)
app.use('/api/invites', inviteRoutes)
app.use('/api/users', userRoutes)

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error('API error:', err.message)
    const message = process.env.NODE_ENV === 'production' ? 'Server error' : err.message
    return res.status(500).json({ error: message })
  },
)

const server = http.createServer(app)
initSocket(server)

server.listen(env.PORT, () => {
  console.log(`NexTalk backend running on http://localhost:${env.PORT}`)
})
