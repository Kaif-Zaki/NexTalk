import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { promises as fs } from "fs";
import path from "path";
import multer from "multer";
import { randomBytes } from "crypto";
import { pool } from "../db";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { emitToChat } from "../socket";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
const uploadsDir = path.resolve(__dirname, "..", "assets", "uploads");

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    // Note: uploadDir is already created synchronously in index.ts
    cb(null, uploadsDir);
  },
  filename: (_req: any, file: any, cb: any) => {
    const safeName = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueName = `${Date.now()}-${randomBytes(6).toString("hex")}-${safeName}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

async function assertMembership(chatId: number, userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ? LIMIT 1",
    [chatId, userId],
  );
  return rows.length > 0;
}

async function isBlocked(chatId: number, userId: number) {
  const [chatRows] = await pool.query<RowDataPacket[]>(
    "SELECT is_group FROM chats WHERE id = ? LIMIT 1",
    [chatId],
  );
  const chat = chatRows[0];
  if (!chat || (chat.is_group as number) === 1) {
    return false;
  }

  const [members] = await pool.query<RowDataPacket[]>(
    "SELECT user_id FROM chat_members WHERE chat_id = ?",
    [chatId],
  );
  const other = members.find((row) => row.user_id !== userId);
  if (!other) return false;

  const [rows] = await pool
    .query<RowDataPacket[]>(
      `
    SELECT 1
    FROM blocks
    WHERE (blocker_id = ? AND blocked_id = ?)
       OR (blocker_id = ? AND blocked_id = ?)
    LIMIT 1
    `,
      [userId, other.user_id, other.user_id, userId],
    )
    .catch(() => [[]] as unknown as [RowDataPacket[], unknown]);
  return rows.length > 0;
}

router.get(
  "/:chatId/messages",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.sub;
    const chatId = Number(req.params.chatId);
    const limit = Math.min(Number(req.query.limit ?? 50), 100);

    if (!Number.isFinite(chatId)) {
      return res.status(400).json({ error: "Invalid chat id" });
    }

    const isMember = await assertMembership(chatId, userId);
    if (!isMember) {
      return res.status(403).json({ error: "Not a member of this chat" });
    }
    if (await isBlocked(chatId, userId)) {
      return res.status(403).json({ error: "Chat is blocked" });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `
    SELECT
      m.id,
      m.body,
      m.created_at,
      u.id AS sender_id,
      u.username AS sender_username,
      u.avatar_url AS sender_avatar_url
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.chat_id = ?
    ORDER BY m.created_at DESC
    LIMIT ?
    `,
      [chatId, limit],
    );

    const messages = rows.reverse();
    return res.json({ messages });
  }),
);

function parseBase64Data(dataUrl: string) {
  const match = dataUrl.match(
    /^data:([a-zA-Z0-9/+.-]+\/[a-zA-Z0-9.+-]+);base64,(.+)$/,
  );
  if (!match) return null;
  return { mime: match[1], data: match[2] };
}

router.post(
  "/:chatId/messages/image",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.sub;
    const chatId = Number(req.params.chatId);
    const { filename, dataUrl } = req.body as {
      filename?: string;
      dataUrl?: string;
    };

    if (!Number.isFinite(chatId)) {
      return res.status(400).json({ error: "Invalid chat id" });
    }

    if (!filename || !dataUrl) {
      return res
        .status(400)
        .json({ error: "Filename and image data are required" });
    }

    const isMember = await assertMembership(chatId, userId);
    if (!isMember) {
      return res.status(403).json({ error: "Not a member of this chat" });
    }
    if (await isBlocked(chatId, userId)) {
      return res.status(403).json({ error: "Chat is blocked" });
    }

    const parsed = parseBase64Data(dataUrl);
    if (!parsed) {
      return res.status(400).json({ error: "Invalid image data" });
    }

    const uploadsDir = path.resolve(__dirname, "..", "assets", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueName = `${Date.now()}-${randomBytes(6).toString("hex")}-${safeName}`;
    const destination = path.join(uploadsDir, uniqueName);
    const fileBuffer = Buffer.from(parsed.data ?? "", "base64");
    await fs.writeFile(destination, fileBuffer);

    const relativePath = `/assets/uploads/${uniqueName}`;
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO messages (chat_id, sender_id, body) VALUES (?, ?, ?)",
      [chatId, userId, relativePath],
    );

    const [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT avatar_url FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
    const avatarUrl = (userRows[0]?.avatar_url as string | null) ?? null;

    const message = {
      id: result.insertId,
      chat_id: chatId,
      sender_id: userId,
      sender_username: req.user!.username,
      sender_avatar_url: avatarUrl,
      body: relativePath,
      created_at: new Date().toISOString(),
    };

    emitToChat(chatId, "message:new", message);
    return res.status(201).json({ message });
  }),
);

router.post(
  "/:chatId/messages/file",
  requireAuth,
  upload.single("file"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.sub;
    const chatId = Number(req.params.chatId);
    const file = (req as any).file;

    if (!Number.isFinite(chatId)) {
      return res.status(400).json({ error: "Invalid chat id" });
    }

    if (!file) {
      return res.status(400).json({ error: "File upload required" });
    }

    const isMember = await assertMembership(chatId, userId);
    if (!isMember) {
      return res.status(403).json({ error: "Not a member of this chat" });
    }
    if (await isBlocked(chatId, userId)) {
      return res.status(403).json({ error: "Chat is blocked" });
    }

    const relativePath = `/assets/uploads/${file.filename}`;
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO messages (chat_id, sender_id, body) VALUES (?, ?, ?)",
      [chatId, userId, relativePath],
    );

    const [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT avatar_url FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
    const avatarUrl = (userRows[0]?.avatar_url as string | null) ?? null;

    const message = {
      id: result.insertId,
      chat_id: chatId,
      sender_id: userId,
      sender_username: req.user!.username,
      sender_avatar_url: avatarUrl,
      body: relativePath,
      created_at: new Date().toISOString(),
    };

    emitToChat(chatId, "message:new", message);
    return res.status(201).json({ message });
  }),
);

router.post(
  "/:chatId/messages",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.sub;
    const chatId = Number(req.params.chatId);
    const { body } = req.body as { body?: string };

    if (!Number.isFinite(chatId)) {
      return res.status(400).json({ error: "Invalid chat id" });
    }

    if (!body || body.trim().length === 0) {
      return res.status(400).json({ error: "Message body is required" });
    }

    const isMember = await assertMembership(chatId, userId);
    if (!isMember) {
      return res.status(403).json({ error: "Not a member of this chat" });
    }
    if (await isBlocked(chatId, userId)) {
      return res.status(403).json({ error: "Chat is blocked" });
    }

    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO messages (chat_id, sender_id, body) VALUES (?, ?, ?)",
      [chatId, userId, body.trim()],
    );

    const [userRows] = await pool.query<RowDataPacket[]>(
      "SELECT avatar_url FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
    const avatarUrl = (userRows[0]?.avatar_url as string | null) ?? null;

    const message = {
      id: result.insertId,
      chat_id: chatId,
      sender_id: userId,
      sender_username: req.user!.username,
      sender_avatar_url: avatarUrl,
      body: body.trim(),
      created_at: new Date().toISOString(),
    };

    emitToChat(chatId, "message:new", message);
    return res.status(201).json({ message });
  }),
);

export default router;
