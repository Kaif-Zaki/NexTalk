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
  inviterEmail: string
  chatTitle: string
  chatId: number
  message: string
  inviteUrl: string
}) {
  if (typeof fetch !== 'function') {
    console.warn('Fetch is not available. Invite email logged only.')
    console.log('[invite-email]', params)
    return
  }
  if (!env.EMAILJS_SERVICE_ID || !env.EMAILJS_TEMPLATE_ID || !env.EMAILJS_PUBLIC_KEY) {
    console.log('[invite-email]', params)
    console.warn('EmailJS is not configured. Invite email logged only.')
    return
  }

  const templateParams: Record<string, string> = {
    to_email: params.to,
    from_name: env.EMAILJS_FROM_NAME || params.inviterName,
    reply_to: params.inviterEmail,
    inviter_name: params.inviterName,
    inviter_email: params.inviterEmail,
    chat_title: params.chatTitle,
    chat_id: String(params.chatId),
    invite_message: params.message,
    invite_url: params.inviteUrl,
  }

  if (env.EMAILJS_FROM_EMAIL) {
    templateParams.from_email = env.EMAILJS_FROM_EMAIL
  }

  const payload: EmailJsPayload = {
    service_id: env.EMAILJS_SERVICE_ID,
    template_id: env.EMAILJS_TEMPLATE_ID,
    user_id: env.EMAILJS_PUBLIC_KEY,
    template_params: templateParams,
  }

  if (env.EMAILJS_PRIVATE_KEY) {
    payload.accessToken = env.EMAILJS_PRIVATE_KEY
  }

  try {
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
  } catch (error) {
    console.warn('EmailJS request failed:', (error as Error).message)
  }
}
