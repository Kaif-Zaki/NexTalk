import { useToast } from '../context/ToastContext'

type CallsPageProps = {
  onBack: () => void
}

const calls = [
  { id: 1, name: 'Design Sync', time: 'Today · 10:00', status: 'Upcoming' },
  { id: 2, name: 'Backend Review', time: 'Today · 15:30', status: 'Planned' },
]

export function CallsPage({ onBack }: CallsPageProps) {
  const { notify } = useToast()

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-title">Calls & meetings</p>
          <p className="panel-sub">Jump into your next session.</p>
        </div>
        <button className="ghost" onClick={onBack}>
          Back to chat
        </button>
      </div>
      <div className="panel-body">
        <div className="call-list">
          {calls.map((call) => (
            <div key={call.id} className="call-card">
              <div>
                <p className="call-name">{call.name}</p>
                <p className="call-time">{call.time}</p>
              </div>
              <button className="primary" onClick={() => notify('Joining call')}>
                {call.status}
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="panel-actions">
        <button className="ghost" onClick={() => notify('Scheduled')}>
          Schedule
        </button>
        <button className="primary" onClick={() => notify('Call started')}>
          Start call
        </button>
      </div>
    </div>
  )
}
