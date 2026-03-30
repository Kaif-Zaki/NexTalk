import { useToast } from '../context/ToastContext'

type FilesPageProps = {
  onBack: () => void
}

const files = [
  { id: 1, name: 'Brand_Guidelines.pdf', size: '4.2 MB' },
  { id: 2, name: 'API_Spec.md', size: '18 KB' },
  { id: 3, name: 'Onboarding_Flow.fig', size: '24 MB' },
]

export function FilesPage({ onBack }: FilesPageProps) {
  const { notify } = useToast()

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-title">Shared files</p>
          <p className="panel-sub">Everything in this chat, organized.</p>
        </div>
        <button className="ghost" onClick={onBack}>
          Back to chat
        </button>
      </div>
      <div className="panel-body">
        <div className="file-grid">
          {files.map((file) => (
            <div key={file.id} className="file-card">
              <div>
                <p className="file-name">{file.name}</p>
                <p className="file-size">{file.size}</p>
              </div>
              <button className="ghost" onClick={() => notify('File opened')}>
                Open
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="panel-actions">
        <button className="ghost" onClick={() => notify('Upload started')}>
          Upload
        </button>
        <button className="primary" onClick={() => notify('Folder created')}>
          New folder
        </button>
      </div>
    </div>
  )
}
