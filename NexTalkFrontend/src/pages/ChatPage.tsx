import { ChatView } from '../components/ChatView'

type ChatPageProps = {
  onFiles: () => void
  onCalls: () => void
  onDetails: () => void
}

export function ChatPage({ onFiles, onCalls, onDetails }: ChatPageProps) {
  return <ChatView onFiles={onFiles} onCalls={onCalls} onDetails={onDetails} />
}
