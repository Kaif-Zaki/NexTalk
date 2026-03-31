import { useChat } from '../context/ChatContext'
import { useToast } from '../context/ToastContext'

type DetailsPageProps = {
  onBack: () => void
}

export function DetailsPage({ onBack }: DetailsPageProps) {
  const { activeChat, deleteChat, blockChat } = useChat()
  const { notify } = useToast()

  const chatName = activeChat?.display_title ?? activeChat?.title ?? 'this chat'
  const isGroup = (activeChat?.is_group ?? 0) === 1

  async function handleDelete() {
    if (!activeChat) return
    try {
      await deleteChat(activeChat.id)
      notify(isGroup ? 'Left the chat' : 'Chat deleted')
      onBack()
    } catch (error) {
      notify((error as Error).message)
    }
  }

  async function handleBlock() {
    if (!activeChat) return
    try {
      await blockChat(activeChat.id)
      notify(`Blocked ${chatName}`)
      onBack()
    } catch (error) {
      notify((error as Error).message)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-title">Chat details</p>
          <p className="panel-sub">Quick snapshot and next actions.</p>
        </div>
        <button className="ghost" onClick={onBack}>
          Back to chat
        </button>
      </div>
      <div className="panel-body details-grid">
        <div className="details-card">
          <p className="section-title">Team snapshot</p>
          <div className="metrics">
            <div>
              <p className="metric-value">8</p>
              <p className="metric-label">Members</p>
            </div>
            <div>
              <p className="metric-value">3</p>
              <p className="metric-label">Online</p>
            </div>
            <div>
              <p className="metric-value">12</p>
              <p className="metric-label">Files</p>
            </div>
          </div>
        </div>
        <div className="details-card">
          <p className="section-title">Next actions</p>
          <ul className="task-list">
            <li>Finalize schema migration</li>
            <li>Review onboarding copy</li>
            <li>Confirm launch checklist</li>
          </ul>
          <button className="primary" onClick={handleDelete}>
            {isGroup ? 'Leave chat' : 'Delete chat'}
          </button>
        </div>
      </div>
      <div className="panel-actions">
        <button className="ghost" onClick={onBack}>
          Cancel
        </button>
        {!isGroup && (
          <button className="primary" onClick={handleBlock}>
            Block user
          </button>
        )}
      </div>
    </div>
  )
}
