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
  EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID ?? '',
  EMAILJS_TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID ?? '',
  EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY ?? '',
  EMAILJS_PRIVATE_KEY: process.env.EMAILJS_PRIVATE_KEY ?? '',
  EMAILJS_FROM_NAME: process.env.EMAILJS_FROM_NAME ?? '',
  EMAILJS_FROM_EMAIL: process.env.EMAILJS_FROM_EMAIL ?? '',
}

export function warnIfInsecureEnv() {
  if (env.JWT_SECRET === 'change-me') {
    console.warn('JWT_SECRET is using the default value. Set it in .env.')
  }
  if (!env.EMAILJS_SERVICE_ID || !env.EMAILJS_TEMPLATE_ID || !env.EMAILJS_PUBLIC_KEY) {
    console.warn('EmailJS is not configured. Invite emails will be logged only.')
  }
}
