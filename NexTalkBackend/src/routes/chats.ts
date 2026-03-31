import { Router } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { pool } from '../db'
import { requireAuth, type AuthedRequest } from '../middleware/auth'
import { createInvite } from './invites'
import { asyncHandler } from '../utils/asyncHandler'
import { normalizeMobileNumber } from '../utils/mobile'

const router = Router()

async function isMember(chatId: number, userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ? LIMIT 1',
    [chatId, userId],
  )
  return rows.length > 0
}

async function findDirectChatBetweenUsers(userAId: number, userBId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT c.id
    FROM chats c
    JOIN chat_members cm ON cm.chat_id = c.id
    WHERE c.is_group = 0
    GROUP BY c.id
    HAVING
      SUM(cm.user_id = ?) = 1
      AND SUM(cm.user_id = ?) = 1
      AND COUNT(*) = 2
    LIMIT 1
    `,
    [userAId, userBId],
  )
  return (rows[0]?.id as number | undefined) ?? null
}

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
        m.created_at AS last_message_at,
        (
          SELECT cm2.user_id
          FROM chat_members cm2
          WHERE cm2.chat_id = c.id
            AND cm2.user_id <> ?
          LIMIT 1
        ) AS other_user_id,
        COALESCE(
          c.title,
          (
            SELECT u.username
            FROM chat_members cm2
            JOIN users u ON u.id = cm2.user_id
            WHERE cm2.chat_id = c.id
              AND cm2.user_id <> ?
            LIMIT 1
          ),
          (
            SELECT i.invitee_email
            FROM invites i
            WHERE i.chat_id = c.id
              AND i.status = 'pending'
            ORDER BY i.created_at DESC
            LIMIT 1
          )
        ) AS display_title
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
      [userId, userId, userId],
    )

    let blockSet = new Set<string>()
    try {
      const [blockRows] = await pool.query<RowDataPacket[]>(
        'SELECT blocker_id, blocked_id FROM blocks WHERE blocker_id = ? OR blocked_id = ?',
        [userId, userId],
      )
      blockSet = new Set(
        blockRows.map(
          (row) => `${row.blocker_id as number}:${row.blocked_id as number}`,
        ),
      )
    } catch (error) {
      console.warn('Blocks table not available yet:', (error as Error).message)
    }

    const chats = rows.filter((chat) => {
      if ((chat.is_group as number) === 1) return true
      const otherUserId = chat.other_user_id as number | null
      if (!otherUserId) return true
      return (
        !blockSet.has(`${userId}:${otherUserId}`) &&
        !blockSet.has(`${otherUserId}:${userId}`)
      )
    })

    return res.json({ chats })
  }),
)

router.post(
  '/direct/mobile',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.sub
    const { mobileNumber } = req.body as { mobileNumber?: string }

    if (!mobileNumber || !mobileNumber.trim()) {
      return res.status(400).json({ error: 'Mobile number is required' })
    }

    const normalizedMobile = normalizeMobileNumber(mobileNumber)
    if (!normalizedMobile) {
      return res.status(400).json({ error: 'Mobile number is invalid' })
    }

    const [targetRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, username FROM users WHERE mobile_number = ? LIMIT 1',
      [normalizedMobile],
    )
    const targetUser = targetRows[0]

    if (!targetUser) {
      return res.status(404).json({
        error: 'This mobile number is not registered on NexTalk yet',
      })
    }

    const targetUserId = targetUser.id as number
    if (targetUserId === userId) {
      return res.status(400).json({ error: 'You cannot start a chat with yourself' })
    }

    try {
      const [blockRows] = await pool.query<RowDataPacket[]>(
        `
        SELECT 1
        FROM blocks
        WHERE (blocker_id = ? AND blocked_id = ?)
           OR (blocker_id = ? AND blocked_id = ?)
        LIMIT 1
        `,
        [userId, targetUserId, targetUserId, userId],
      )
      if (blockRows.length > 0) {
        return res.status(403).json({ error: 'This chat is blocked' })
      }
    } catch (error) {
      console.warn('Blocks lookup skipped:', (error as Error).message)
    }

    const existingChatId = await findDirectChatBetweenUsers(userId, targetUserId)
    if (existingChatId) {
      return res.json({ chatId: existingChatId, existing: true })
    }

    const [chatResult] = await pool.query<ResultSetHeader>(
      'INSERT INTO chats (title, is_group) VALUES (?, 0)',
      [null],
    )
    const chatId = chatResult.insertId

    await pool.query(
      'INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?), (?, ?)',
      [chatId, userId, chatId, targetUserId],
    )

    return res.status(201).json({ chatId, existing: false })
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
    ? memberEmails
        .map((email) => email.toLowerCase().trim())
        .filter((email) => Boolean(email) && email !== req.user!.email.toLowerCase())
    : []

  const members = Array.from(new Set([userId, ...requestedMembers]))

  if (members.length < 2 && requestedEmails.length === 0) {
    return res.status(400).json({ error: 'Add at least one other member' })
  }

  const trimmedTitle = title?.trim() || null
  const isGroup =
    members.length > 2 || requestedEmails.length > 1 || Boolean(trimmedTitle)

  const inferredTitle: string | null = trimmedTitle ?? null
  const [chatResult] = await pool.query<ResultSetHeader>(
    'INSERT INTO chats (title, is_group) VALUES (?, ?)',
    [inferredTitle, isGroup ? 1 : 0],
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

      const message =
        welcomeMessage?.trim() || `${req.user!.username} invited you to chat.`

      await Promise.all(
        requestedEmails.map((email) =>
          createInvite({
            chatId,
            inviterId: userId,
            inviterName: req.user!.username,
            inviterEmail: req.user!.email,
            inviteeEmail: email,
            message,
            chatTitle: trimmedTitle ?? 'New chat',
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

router.post(
  '/:chatId/members',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const chatId = Number(req.params.chatId)
    const userId = req.user!.sub
    const { email, welcomeMessage } = req.body as {
      email?: string
      welcomeMessage?: string
    }

    if (!Number.isFinite(chatId)) {
      return res.status(400).json({ error: 'Invalid chat id' })
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const inviteEmail = email.toLowerCase().trim()
    if (inviteEmail === req.user!.email.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot add yourself' })
    }

    const memberAllowed = await isMember(chatId, userId)
    if (!memberAllowed) {
      return res.status(403).json({ error: 'Not a member of this chat' })
    }

    const [chatRows] = await pool.query<RowDataPacket[]>(
      'SELECT title, is_group FROM chats WHERE id = ? LIMIT 1',
      [chatId],
    )
    const chat = chatRows[0]
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' })
    }

    const [userRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [inviteEmail],
    )
    const existingUser = userRows[0]
    if (existingUser?.id) {
      await pool.query(
        'INSERT IGNORE INTO chat_members (chat_id, user_id) VALUES (?, ?)',
        [chatId, existingUser.id],
      )
    }

    const message =
      welcomeMessage?.trim() || `${req.user!.username} invited you to this chat.`
    await createInvite({
      chatId,
      inviterId: userId,
      inviterName: req.user!.username,
      inviterEmail: req.user!.email,
      inviteeEmail: inviteEmail,
      message,
      chatTitle: (chat.title as string | null) ?? 'NexTalk chat',
    })

    if ((chat.is_group as number) === 0) {
      await pool.query('UPDATE chats SET is_group = 1 WHERE id = ? LIMIT 1', [chatId])
    }

    return res.json({ success: true })
  }),
)

router.post(
  '/:chatId/mobile-members',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const chatId = Number(req.params.chatId)
    const userId = req.user!.sub
    const { name, mobileNumber } = req.body as {
      name?: string
      mobileNumber?: string
    }

    if (!Number.isFinite(chatId)) {
      return res.status(400).json({ error: 'Invalid chat id' })
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Member name is required' })
    }
    if (!mobileNumber || !mobileNumber.trim()) {
      return res.status(400).json({ error: 'Mobile number is required' })
    }

    const memberAllowed = await isMember(chatId, userId)
    if (!memberAllowed) {
      return res.status(403).json({ error: 'Not a member of this chat' })
    }

    const [chatRows] = await pool.query<RowDataPacket[]>(
      'SELECT is_group FROM chats WHERE id = ? LIMIT 1',
      [chatId],
    )
    const chat = chatRows[0]
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' })
    }

    await pool.query(
      `
      INSERT INTO chat_mobile_members (chat_id, added_by_user_id, member_name, mobile_number)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE member_name = VALUES(member_name)
      `,
      [chatId, userId, name.trim(), mobileNumber.trim()],
    )

    if ((chat.is_group as number) === 0) {
      await pool.query('UPDATE chats SET is_group = 1 WHERE id = ? LIMIT 1', [chatId])
    }

    return res.json({ success: true })
  }),
)

router.delete(
  '/:chatId',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.sub
    const chatId = Number(req.params.chatId)
    if (!Number.isFinite(chatId)) {
      return res.status(400).json({ error: 'Invalid chat id' })
    }

    await pool.query('DELETE FROM chat_members WHERE chat_id = ? AND user_id = ?', [
      chatId,
      userId,
    ])

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM chat_members WHERE chat_id = ?',
      [chatId],
    )
    const remaining = Number(rows[0]?.count ?? 0)
    if (remaining === 0) {
      await pool.query('DELETE FROM chats WHERE id = ? LIMIT 1', [chatId])
    }

    return res.json({ success: true })
  }),
)

router.post(
  '/:chatId/block',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.sub
    const chatId = Number(req.params.chatId)
    if (!Number.isFinite(chatId)) {
      return res.status(400).json({ error: 'Invalid chat id' })
    }

    const [chatRows] = await pool.query<RowDataPacket[]>(
      'SELECT is_group FROM chats WHERE id = ? LIMIT 1',
      [chatId],
    )
    const chat = chatRows[0]
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' })
    }
    if ((chat.is_group as number) === 1) {
      return res.status(400).json({ error: 'Blocking is only for 1-to-1 chats' })
    }

    const [members] = await pool.query<RowDataPacket[]>(
      'SELECT user_id FROM chat_members WHERE chat_id = ?',
      [chatId],
    )
    const other = members.find((row) => row.user_id !== userId)
    if (!other) {
      return res.status(400).json({ error: 'Chat does not have another user yet' })
    }

    try {
      await pool.query(
        'INSERT IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)',
        [userId, other.user_id],
      )
    } catch (error) {
      return res.status(500).json({
        error: 'Blocks table missing. Run the latest database update.',
      })
    }

    return res.json({ success: true })
  }),
)

export default router
