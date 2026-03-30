import { Router } from 'express'
import { randomBytes } from 'crypto'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { pool } from '../db'
import { requireAuth, type AuthedRequest } from '../middleware/auth'
import { sendInviteEmail } from '../mailer'
import { env } from '../env'

const router = Router()

router.get('/:token', async (req, res) => {
  const { token } = req.params

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT i.id, i.chat_id, i.invitee_email, i.message, i.status, c.title
    FROM invites i
    JOIN chats c ON c.id = i.chat_id
    WHERE i.token = ?
    LIMIT 1
    `,
    [token],
  )

  const invite = rows[0]
  if (!invite) {
    return res.status(404).json({ error: 'Invite not found' })
  }

  return res.json({ invite })
})

router.post('/:token/accept', requireAuth, async (req: AuthedRequest, res) => {
  const { token } = req.params
  const userId = req.user!.sub

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT i.id, i.chat_id, i.invitee_email, i.status
    FROM invites i
    WHERE i.token = ?
    LIMIT 1
    `,
    [token],
  )

  const invite = rows[0]
  if (!invite) {
    return res.status(404).json({ error: 'Invite not found' })
  }

  if (invite.status !== 'pending') {
    return res.status(400).json({ error: 'Invite is no longer valid' })
  }

  await pool.query(
    'INSERT IGNORE INTO chat_members (chat_id, user_id) VALUES (?, ?)',
    [invite.chat_id, userId],
  )

  await pool.query<ResultSetHeader>(
    'UPDATE invites SET status = ? WHERE id = ? LIMIT 1',
    ['accepted', invite.id],
  )

  return res.json({ success: true, chatId: invite.chat_id })
})

export async function createInvite(params: {
  chatId: number
  inviterId: number
  inviterName: string
  inviteeEmail: string
  message: string
  chatTitle: string
}) {
  const token = randomBytes(24).toString('hex')

  await pool.query<ResultSetHeader>(
    `
    INSERT INTO invites (chat_id, inviter_id, invitee_email, message, token)
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      params.chatId,
      params.inviterId,
      params.inviteeEmail,
      params.message,
      token,
    ],
  )

  const inviteUrl = `${env.APP_BASE_URL}/invite/${token}`
  await sendInviteEmail({
    to: params.inviteeEmail,
    inviterName: params.inviterName,
    chatTitle: params.chatTitle,
    message: params.message,
    inviteUrl,
  })
}

export default router
