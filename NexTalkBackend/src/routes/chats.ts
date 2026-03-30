import { Router } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { pool } from '../db'
import { requireAuth, type AuthedRequest } from '../middleware/auth'
import { createInvite } from './invites'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
  const userId = req.user!.sub

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      c.id,
      c.title,
      c.is_group,
      c.created_at,
      m.body AS last_message,
      m.created_at AS last_message_at
    FROM chats c
    JOIN chat_members cm ON cm.chat_id = c.id
    LEFT JOIN messages m ON m.id = (
      SELECT id FROM messages
      WHERE chat_id = c.id
      ORDER BY created_at DESC
      LIMIT 1
    )
    WHERE cm.user_id = ?
    ORDER BY COALESCE(m.created_at, c.created_at) DESC
    `,
    [userId],
  )

  return res.json({ chats: rows })
  }),
)

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
  const { title, memberIds, memberEmails, welcomeMessage } = req.body as {
    title?: string
    memberIds?: number[]
    memberEmails?: string[]
    welcomeMessage?: string
  }

  const userId = req.user!.sub
  const requestedMembers = Array.isArray(memberIds) ? memberIds : []
  const requestedEmails = Array.isArray(memberEmails)
    ? memberEmails.map((email) => email.toLowerCase().trim()).filter(Boolean)
    : []

  const members = Array.from(new Set([userId, ...requestedMembers]))

  if (members.length < 2 && requestedEmails.length === 0) {
    return res.status(400).json({ error: 'Add at least one other member' })
  }

  const isGroup =
    members.length > 2 || requestedEmails.length > 1 || Boolean(title)
  const [chatResult] = await pool.query<ResultSetHeader>(
    'INSERT INTO chats (title, is_group) VALUES (?, ?)',
    [title ?? null, isGroup ? 1 : 0],
  )

  const chatId = chatResult.insertId
  const values = members.map((memberId) => [chatId, memberId])
  await pool.query('INSERT INTO chat_members (chat_id, user_id) VALUES ?', [
    values,
  ])

  if (requestedEmails.length > 0) {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT id, email FROM users WHERE email IN (?)',
        [requestedEmails],
      )
      const existingUsers = rows.map((row) => ({
        id: row.id as number,
        email: String(row.email).toLowerCase(),
      }))

      const existingIds = existingUsers.map((user) => user.id)
      if (existingIds.length > 0) {
        const existingValues = existingIds.map((memberId) => [chatId, memberId])
        await pool.query(
          'INSERT IGNORE INTO chat_members (chat_id, user_id) VALUES ?',
          [existingValues],
        )
      }

      const existingEmailSet = new Set(existingUsers.map((user) => user.email))
      const pendingEmails = requestedEmails.filter(
        (email) => !existingEmailSet.has(email),
      )

      const message =
        welcomeMessage?.trim() || `${req.user!.username} invited you to chat.`

      await Promise.all(
        pendingEmails.map((email) =>
          createInvite({
            chatId,
            inviterId: userId,
            inviterName: req.user!.username,
            inviterEmail: req.user!.email,
            inviteeEmail: email,
            message,
            chatTitle: title ?? 'New chat',
          }),
        ),
      )
    } catch (error) {
      console.warn('Invite flow failed:', (error as Error).message)
    }
  }

  return res.status(201).json({ chatId })
  }),
)

export default router
