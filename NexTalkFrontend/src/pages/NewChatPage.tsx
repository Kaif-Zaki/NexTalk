import { useState } from 'react'
import { useChat } from '../context/ChatContext'
import { useToast } from '../context/ToastContext'

type NewChatPageProps = {
  onBack: () => void
}

export function NewChatPage({ onBack }: NewChatPageProps) {
  const { createChat } = useChat()
  const { notify } = useToast()
  const [form, setForm] = useState({
    title: '',
    memberEmails: '',
    message: '',
  })

  async function handleCreate() {
    const memberEmails = form.memberEmails
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean)

    try {
      await createChat({
        title: form.title,
        memberEmails,
        welcomeMessage: form.message,
      })
      notify('Chat created and invites sent')
      setForm({ title: '', memberEmails: '', message: '' })
      onBack()
    } catch (error) {
      notify((error as Error).message)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-title">Create a new chat</p>
          <p className="panel-sub">Add member emails and send an invite message.</p>
        </div>
        <button className="ghost" onClick={onBack}>
          Back to chat
        </button>
      </div>
      <div className="panel-body">
        <label className="field">
          Chat title
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="e.g. Project Phoenix"
          />
        </label>
        <label className="field">
          Member emails (comma separated)
          <input
            value={form.memberEmails}
            onChange={(event) =>
              setForm({ ...form, memberEmails: event.target.value })
            }
            placeholder="sam@team.com, alex@team.com"
          />
        </label>
        <label className="field">
          Invite message
          <input
            value={form.message}
            onChange={(event) => setForm({ ...form, message: event.target.value })}
            placeholder="Say hello to the team"
          />
        </label>
      </div>
      <div className="panel-actions">
        <button className="ghost" onClick={onBack}>
          Cancel
        </button>
        <button className="primary" onClick={handleCreate}>
          Create chat
        </button>
      </div>
    </div>
  )
}
