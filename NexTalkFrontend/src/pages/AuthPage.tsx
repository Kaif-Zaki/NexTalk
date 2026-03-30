import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

type AuthPageProps = {
  onDone: () => void
}

export function AuthPage({ onDone }: AuthPageProps) {
  const { login, register } = useAuth()
  const { notify } = useToast()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        await register(form.username, form.email, form.password)
      }
      notify('Welcome to NexTalk')
      onDone()
    } catch (error) {
      notify((error as Error).message)
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-hero">
        <div className="auth-brand">
          <span className="brand-mark">N</span>
          <div>
            <p className="auth-brand-name">NexTalk</p>
            <p className="auth-brand-tag">Realtime collaboration</p>
          </div>
        </div>
        <h2 className="auth-title">
          {mode === 'login'
            ? 'Welcome back to your space.'
            : 'Create your team workspace.'}
        </h2>
        <p className="auth-copy">
          {mode === 'login'
            ? 'Pick up conversations exactly where you left them. Secure, fast, and built for focused teams.'
            : 'Invite teammates, share files, and stay aligned with one workspace for every project.'}
        </p>
        <div className="auth-highlights">
          <div className="auth-chip">Live chat rooms</div>
          <div className="auth-chip">Instant invites</div>
          <div className="auth-chip">Secure access</div>
        </div>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-form-header">
          <p className="auth-form-title">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </p>
          <p className="auth-form-sub">
            {mode === 'login'
              ? 'Use your email and password to continue.'
              : 'Start with a few details to get started.'}
          </p>
        </div>

        {mode === 'register' ? (
          <label className="field">
            Username
            <input
              value={form.username}
              onChange={(event) =>
                setForm({ ...form, username: event.target.value })
              }
              placeholder="Enter your name"
              required
            />
          </label>
        ) : null}
        <label className="field">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="you@company.com"
            required
          />
        </label>
        <label className="field">
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
            placeholder="Minimum 6 characters"
            required
          />
        </label>

        <button type="submit" className="primary auth-submit">
          {mode === 'login' ? 'Login' : 'Register'}
        </button>

        <button
          type="button"
          className="ghost auth-toggle"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login'
            ? 'New here? Create an account'
            : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
