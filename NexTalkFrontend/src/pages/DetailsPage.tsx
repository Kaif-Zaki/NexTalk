import { useToast } from '../context/ToastContext'

type DetailsPageProps = {
  onBack: () => void
}

export function DetailsPage({ onBack }: DetailsPageProps) {
  const { notify } = useToast()

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
          <button className="primary" onClick={() => notify('Task created')}>
            Create task
          </button>
        </div>
      </div>
      <div className="panel-actions">
        <button className="ghost" onClick={() => notify('Pinned')}>
          Pin chat
        </button>
        <button className="primary" onClick={() => notify('Settings opened')}>
          Settings
        </button>
      </div>
    </div>
  )
}
