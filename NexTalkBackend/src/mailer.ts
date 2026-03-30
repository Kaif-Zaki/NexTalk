import nodemailer from 'nodemailer'
import { env } from './env'

const hasSmtp = Boolean(env.SMTP_HOST)

const transporter = hasSmtp
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          }
        : undefined,
    })
  : null

export async function sendInviteEmail(params: {
  to: string
  inviterName: string
  chatTitle: string
  message: string
  inviteUrl: string
}) {
  if (!transporter) {
    console.log('[invite-email]', params)
    return
  }

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: params.to,
    subject: `You are invited to ${params.chatTitle} on NexTalk`,
    text: `${params.inviterName} invited you to join "${params.chatTitle}".

Message: ${params.message}

Accept: ${params.inviteUrl}
`,
  })
}
