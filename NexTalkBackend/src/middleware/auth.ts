import type { NextFunction, Response } from 'express'
import { verifyToken, type AuthTokenPayload } from '../auth'
import type { Request } from 'express'

export type AuthedRequest = Request & { user?: AuthTokenPayload }

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = header.replace('Bearer ', '').trim()
  try {
    req.user = verifyToken(token)
    return next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
