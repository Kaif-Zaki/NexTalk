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
    message: '',
  })
  const [memberInput, setMemberInput] = useState('')
  const [members, setMembers] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  function handleAddMember() {
    const next = memberInput.trim().toLowerCase()
    if (!next) return
    if (members.includes(next)) {
      notify('Member already added')
      return
    }
    setMembers((prev) => [...prev, next])
    setMemberInput('')
  }

  function handleRemoveMember(email: string) {
    setMembers((prev) => prev.filter((member) => member !== email))
  }

  async function handleCreate() {
    if (members.length === 0) {
      notify('Add at least one member')
      return
    }

    try {
      setCreating(true)
      await createChat({
        title: form.title,
        memberEmails: members,
        welcomeMessage: form.message,
      })
      notify('Chat created and invites sent')
      setForm({ title: '', message: '' })
      setMembers([])
      setMemberInput('')
      onBack()
    } catch (error) {
      notify((error as Error).message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-title">Create a channel</p>
          <p className="panel-sub">Invite people by email and send a channel invite message.</p>
        </div>
        <button className="ghost" onClick={onBack}>
          Back to chat
        </button>
      </div>
      <div className="panel-body">
        <label className="field">
          Channel title
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="e.g. Product Team"
          />
        </label>
        <label className="field">
          Add member
          <div className="member-row">
            <input
              value={memberInput}
              onChange={(event) => setMemberInput(event.target.value)}
              placeholder="alex@team.com"
            />
            <button className="ghost" onClick={handleAddMember} type="button">
              Add member
            </button>
          </div>
        </label>
        <div className="member-tags">
          {members.length === 0 ? (
            <p className="member-empty">No members added</p>
          ) : (
            members.map((member) => (
              <button
                key={member}
                className="member-tag"
                onClick={() => handleRemoveMember(member)}
                type="button"
              >
                {member} ×
              </button>
            ))
          )}
        </div>
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
        <button className="primary" onClick={handleCreate} disabled={creating}>
          {creating ? <span className="btn-spinner" /> : 'Create channel'}
        </button>
      </div>
    </div>
  )
}
