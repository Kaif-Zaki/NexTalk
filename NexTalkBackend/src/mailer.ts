import { env } from './env'

type EmailJsPayload = {
  service_id: string
  template_id: string
  user_id: string
  accessToken?: string
  template_params: Record<string, string>
}

export async function sendInviteEmail(params: {
  to: string
  inviterName: string
  chatTitle: string
  message: string
  inviteUrl: string
}) {
  if (!env.EMAILJS_SERVICE_ID || !env.EMAILJS_TEMPLATE_ID || !env.EMAILJS_PUBLIC_KEY) {
    console.log('[invite-email]', params)
    console.warn('EmailJS is not configured. Invite email logged only.')
    return
  }

  const payload: EmailJsPayload = {
    service_id: env.EMAILJS_SERVICE_ID,
    template_id: env.EMAILJS_TEMPLATE_ID,
    user_id: env.EMAILJS_PUBLIC_KEY,
    template_params: {
      to_email: params.to,
      inviter_name: params.inviterName,
      chat_title: params.chatTitle,
      invite_message: params.message,
      invite_url: params.inviteUrl,
    },
  }

  if (env.EMAILJS_PRIVATE_KEY) {
    payload.accessToken = env.EMAILJS_PRIVATE_KEY
  }

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    console.warn('EmailJS error:', response.status, text)
  }
}
