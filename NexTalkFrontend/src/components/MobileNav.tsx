type MobileNavProps = {
  active: string
  onChat: () => void
  onFiles: () => void
  onCalls: () => void
  onProfile: () => void
}

export function MobileNav({ active, onChat, onFiles, onCalls, onProfile }: MobileNavProps) {
  return (
    <nav className="mobile-nav">
      <button
        className={`pill ${active === 'chat' ? 'pill--active' : ''}`}
        onClick={onChat}
      >
        Chats
      </button>
      <button
        className={`pill ${active === 'files' ? 'pill--active' : ''}`}
        onClick={onFiles}
      >
        Files
      </button>
      <button
        className={`pill ${active === 'calls' ? 'pill--active' : ''}`}
        onClick={onCalls}
      >
        Calls
      </button>
      <button
        className={`pill ${active === 'profile' ? 'pill--active' : ''}`}
        onClick={onProfile}
      >
        Profile
      </button>
    </nav>
  )
}
