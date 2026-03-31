import { Router } from 'express'
import { promises as fs } from 'fs'
import path from 'path'
import type { RowDataPacket } from 'mysql2/promise'
import { pool } from '../db'
import { requireAuth, type AuthedRequest } from '../middleware/auth'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

function parseImageData(imageData: string): { mime: string; data: string } | null {
  const dataUrlMatch = imageData.match(/^data:(image\/\w+);base64,(.+)$/)
  if (dataUrlMatch?.[1] && dataUrlMatch?.[2]) {
    return { mime: dataUrlMatch[1], data: dataUrlMatch[2] }
  }
  if (typeof imageData === 'string' && imageData.trim().length > 0) {
    return { mime: 'image/png', data: imageData }
  }
  return null
}

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.sub
    const { username } = req.body as { username?: string }

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' })
    }

    await pool.query('UPDATE users SET username = ? WHERE id = ? LIMIT 1', [
      username.trim(),
      userId,
    ])

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, username, email, avatar_url FROM users WHERE id = ? LIMIT 1',
      [userId],
    )
    const user = rows[0]
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    return res.json({
      user: {
        id: user.id as number,
        username: user.username as string,
        email: user.email as string,
        avatarUrl: (user.avatar_url as string | null) ?? null,
      },
    })
  }),
)

router.post(
  '/me/avatar',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.sub
    const { imageData } = req.body as { imageData?: string }

    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' })
    }

    const parsed = parseImageData(imageData)
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid image data' })
    }

    const { mime, data } = parsed
    const allowed = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
    if (!allowed.has(mime)) {
      return res.status(400).json({ error: 'Unsupported image type' })
    }

    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
    const fileName = `user-${userId}-${Date.now()}.${ext}`
    const avatarsDir = path.resolve(__dirname, '..', '..', 'assets', 'avatars')
    await fs.mkdir(avatarsDir, { recursive: true })
    const filePath = path.join(avatarsDir, fileName)
    await fs.writeFile(filePath, Buffer.from(data, 'base64'))

    const avatarUrl = `/assets/avatars/${fileName}`
    await pool.query('UPDATE users SET avatar_url = ? WHERE id = ? LIMIT 1', [
      avatarUrl,
      userId,
    ])

    return res.json({ avatarUrl })
  }),
)

router.delete(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.sub
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT avatar_url FROM users WHERE id = ? LIMIT 1',
      [userId],
    )
    const avatarUrl = rows[0]?.avatar_url as string | null | undefined
    if (avatarUrl) {
      const filePath = path.resolve(__dirname, '..', '..', avatarUrl.replace(/^\//, ''))
      await fs.unlink(filePath).catch(() => undefined)
    }

    await pool.query('DELETE FROM users WHERE id = ? LIMIT 1', [userId])
    return res.json({ success: true })
  }),
)

export default router
