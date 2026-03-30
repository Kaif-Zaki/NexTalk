import { Router } from 'express'
import bcrypt from 'bcryptjs'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { pool } from '../db'
import { signToken } from '../auth'
import { requireAuth, type AuthedRequest } from '../middleware/auth'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.post(
  '/register',
  asyncHandler(async (req, res) => {
  const { username, email, password } = req.body as {
    username?: string
    email?: string
    password?: string
  }

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const [existing] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email],
  )

  if (existing.length > 0) {
    return res.status(409).json({ error: 'Email already registered' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
    [username, email, passwordHash],
  )

  const user = { id: result.insertId, username, email }
  const token = signToken({ sub: user.id, email: user.email, username })
  return res.status(201).json({ user, token })
  }),
)

router.post(
  '/login',
  asyncHandler(async (req, res) => {
  const { email, password } = req.body as {
    email?: string
    password?: string
  }

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' })
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, username, email, password_hash FROM users WHERE email = ? LIMIT 1',
    [email],
  )

  const userRow = rows[0]
  if (!userRow) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const isValid = await bcrypt.compare(password, userRow.password_hash as string)
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const user = {
    id: userRow.id as number,
    username: userRow.username as string,
    email: userRow.email as string,
  }
  const token = signToken({ sub: user.id, email: user.email, username: user.username })
  return res.json({ user, token })
  }),
)

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.user!.sub
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, username, email FROM users WHERE id = ? LIMIT 1',
    [userId],
  )

  const userRow = rows[0]
  if (!userRow) {
    return res.status(401).json({ error: 'User not found' })
  }

  return res.json({
    user: {
      id: userRow.id as number,
      username: userRow.username as string,
      email: userRow.email as string,
    },
  })
  }),
)

export default router
