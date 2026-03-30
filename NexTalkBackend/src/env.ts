import dotenv from 'dotenv'

dotenv.config()

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  DB_HOST: process.env.DB_HOST ?? 'localhost',
  DB_PORT: Number(process.env.DB_PORT ?? 3306),
  DB_USER: process.env.DB_USER ?? 'root',
  DB_PASSWORD: process.env.DB_PASSWORD ?? '',
  DB_NAME: process.env.DB_NAME ?? 'nextalk',
  JWT_SECRET: process.env.JWT_SECRET ?? 'change-me',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  APP_BASE_URL: process.env.APP_BASE_URL ?? 'http://localhost:5173',
  SMTP_HOST: process.env.SMTP_HOST ?? '',
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASS: process.env.SMTP_PASS ?? '',
  SMTP_FROM: process.env.SMTP_FROM ?? 'NexTalk <no-reply@nextalk.local>',
}

export function warnIfInsecureEnv() {
  if (env.JWT_SECRET === 'change-me') {
    console.warn('JWT_SECRET is using the default value. Set it in .env.')
  }
  if (!env.SMTP_HOST) {
    console.warn('SMTP_HOST is empty. Invite emails will be logged only.')
  }
}
