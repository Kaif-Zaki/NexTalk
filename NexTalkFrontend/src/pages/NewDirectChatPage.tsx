import { useState } from 'react'
import { useChat } from '../context/ChatContext'
import { useToast } from '../context/ToastContext'

type NewDirectChatPageProps = {
  onBack: () => void
}

export function NewDirectChatPage({ onBack }: NewDirectChatPageProps) {
  const { createDirectChatByMobile } = useChat()
  const { notify } = useToast()
  const [mobileNumber, setMobileNumber] = useState('')
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    if (!mobileNumber.trim()) {
      notify('Enter a mobile number')
      return
    }

    try {
      setCreating(true)
      await createDirectChatByMobile(mobileNumber.trim())
      notify('Direct chat is ready')
      setMobileNumber('')
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
          <p className="panel-title">New direct chat</p>
          <p className="panel-sub">Start a 1-to-1 chat with a registered mobile number.</p>
        </div>
        <button className="ghost" onClick={onBack}>
          Back to chat
        </button>
      </div>
      <div className="panel-body">
        <label className="field">
          Mobile number
          <input
            value={mobileNumber}
            onChange={(event) => setMobileNumber(event.target.value)}
            placeholder="+94 77 123 4567"
          />
        </label>
        <p className="panel-sub">
          Both users must be registered in NexTalk. If the number is not registered, chat will not be created.
        </p>
      </div>
      <div className="panel-actions">
        <button className="ghost" onClick={onBack}>
          Cancel
        </button>
        <button className="primary" onClick={handleCreate} disabled={creating}>
          {creating ? <span className="btn-spinner" /> : 'Start direct chat'}
        </button>
      </div>
    </div>
  )
}
