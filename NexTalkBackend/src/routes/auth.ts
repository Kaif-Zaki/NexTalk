import { Router } from 'express'
import bcrypt from 'bcryptjs'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { pool } from '../db'
import { signToken } from '../auth'
import { requireAuth, type AuthedRequest } from '../middleware/auth'
import { asyncHandler } from '../utils/asyncHandler'
import { normalizeMobileNumber } from '../utils/mobile'

const router = Router()

router.post(
  '/register',
  asyncHandler(async (req, res) => {
  const { username, email, password, mobileNumber } = req.body as {
    username?: string
    email?: string
    password?: string
    mobileNumber?: string
  }

  if (!username || !email || !password || !mobileNumber) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const normalizedMobile = normalizeMobileNumber(mobileNumber)
  if (!normalizedMobile) {
    return res.status(400).json({ error: 'Mobile number is invalid' })
  }

  const [existing] = await pool.query<RowDataPacket[]>(
    'SELECT id, email, mobile_number FROM users WHERE email = ? OR mobile_number = ? LIMIT 1',
    [normalizedEmail, normalizedMobile],
  )

  if (existing.length > 0) {
    const row = existing[0]
    if (!row) {
      return res.status(409).json({ error: 'Account already exists' })
    }
    if ((row.email as string) === normalizedEmail) {
      return res.status(409).json({ error: 'Email already registered' })
    }
    return res.status(409).json({ error: 'Mobile number already registered' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO users (username, email, mobile_number, password_hash) VALUES (?, ?, ?, ?)',
    [username.trim(), normalizedEmail, normalizedMobile, passwordHash],
  )

  const user = {
    id: result.insertId,
    username: username.trim(),
    email: normalizedEmail,
    mobileNumber: normalizedMobile,
    avatarUrl: null,
  }
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
    'SELECT id, username, email, mobile_number, password_hash, avatar_url FROM users WHERE email = ? LIMIT 1',
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
    mobileNumber: (userRow.mobile_number as string | null) ?? null,
    avatarUrl: (userRow.avatar_url as string | null) ?? null,
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
    'SELECT id, username, email, mobile_number, avatar_url FROM users WHERE id = ? LIMIT 1',
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
      mobileNumber: (userRow.mobile_number as string | null) ?? null,
      avatarUrl: (userRow.avatar_url as string | null) ?? null,
    },
  })
  }),
)

export default router
