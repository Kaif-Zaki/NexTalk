import { ChatView } from '../components/ChatView'

type ChatPageProps = {
  onFiles: () => void
  onCalls: () => void
  onDetails: () => void
  onMenuToggle: () => void
}

export function ChatPage({
  onFiles,
  onCalls,
  onDetails,
  onMenuToggle,
}: ChatPageProps) {
  return (
    <ChatView
      onFiles={onFiles}
      onCalls={onCalls}
      onDetails={onDetails}
      onMenuToggle={onMenuToggle}
    />
  )
}
