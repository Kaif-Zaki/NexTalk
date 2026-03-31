import { useState } from 'react'
import { useChat } from '../context/ChatContext'
import { useToast } from '../context/ToastContext'

type AddMemberPageProps = {
  onBack: () => void
}

export function AddMemberPage({ onBack }: AddMemberPageProps) {
  const { activeChat, addMobileMember } = useChat()
  const { notify } = useToast()
  const [name, setName] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!activeChat) {
      notify('Select a channel first')
      return
    }
    if (!name.trim() || !mobileNumber.trim()) {
      notify('Enter name and mobile number')
      return
    }
    try {
      setSaving(true)
      await addMobileMember(activeChat.id, name.trim(), mobileNumber.trim())
      notify('Member saved')
      setName('')
      setMobileNumber('')
      onBack()
    } catch (error) {
      notify((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-title">Add member by mobile</p>
          <p className="panel-sub">
            Save contact in {activeChat?.display_title ?? activeChat?.title ?? 'selected chat'}
          </p>
        </div>
        <button className="ghost" onClick={onBack}>
          Back to chat
        </button>
      </div>
      <div className="panel-body">
        <label className="field">
          Member name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Alex Fernando"
          />
        </label>
        <label className="field">
          Mobile number
          <input
            value={mobileNumber}
            onChange={(event) => setMobileNumber(event.target.value)}
            placeholder="+94 77 123 4567"
          />
        </label>
      </div>
      <div className="panel-actions">
        <button className="ghost" onClick={onBack}>
          Cancel
        </button>
        <button className="primary" onClick={handleAdd} disabled={saving}>
          {saving ? <span className="btn-spinner" /> : 'Add member'}
        </button>
      </div>
    </div>
  )
}
