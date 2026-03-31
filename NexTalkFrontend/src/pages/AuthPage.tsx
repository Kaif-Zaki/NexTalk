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
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    username: '',
    email: '',
    mobileNumber: '',
    password: '',
  })

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    try {
      setLoading(true)
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        await register(form.username, form.email, form.mobileNumber, form.password)
      }
      notify('Welcome to NexTalk')
      onDone()
    } catch (error) {
      notify((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-logo">⚡</div>
      <h1>NexTalk</h1>
      <p className="auth-sub">Connect. Chat. Collaborate.</p>

      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <label className="auth-field">
            <span>Username</span>
            <div className="auth-input-wrap">
              <span>👤</span>
              <input
                value={form.username}
                onChange={(event) =>
                  setForm({ ...form, username: event.target.value })
                }
                placeholder="Your name"
                required
              />
            </div>
          </label>
        )}

        <label className="auth-field">
          <span>Email</span>
          <div className="auth-input-wrap">
            <span>✉</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="name@company.com"
              required
            />
          </div>
        </label>

        {mode === 'register' && (
          <label className="auth-field">
            <span>Mobile number</span>
            <div className="auth-input-wrap">
              <span>📱</span>
              <input
                type="tel"
                value={form.mobileNumber}
                onChange={(event) =>
                  setForm({ ...form, mobileNumber: event.target.value })
                }
                placeholder="+94 77 123 4567"
                required
              />
            </div>
          </label>
        )}

        <label className="auth-field">
          <span>Password</span>
          <div className="auth-input-wrap">
            <span>🔒</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              placeholder="••••••••"
              required
            />
          </div>
        </label>

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? <span className="btn-spinner" /> : mode === 'login' ? 'Login' : 'Register'}
        </button>
      </form>

      <p className="auth-toggle">
        {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Register' : 'Login'}
        </button>
      </p>
    </div>
  )
}
