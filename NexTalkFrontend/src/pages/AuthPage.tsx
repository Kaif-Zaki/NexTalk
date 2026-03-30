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
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-title">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </p>
          <p className="panel-sub">
            {mode === 'login'
              ? 'Login to continue chatting.'
              : 'Register to join your team.'}
          </p>
        </div>
      </div>
      <form className="panel-body" onSubmit={handleSubmit}>
        {mode === 'register' ? (
          <label className="field">
            Username
            <input
              value={form.username}
              onChange={(event) =>
                setForm({ ...form, username: event.target.value })
              }
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
            required
          />
        </label>
        <div className="panel-actions panel-actions--split">
          <button
            type="button"
            className="ghost"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Create account' : 'Use existing account'}
          </button>
          <button type="submit" className="primary">
            {mode === 'login' ? 'Login' : 'Register'}
          </button>
        </div>
      </form>
    </div>
  )
}
