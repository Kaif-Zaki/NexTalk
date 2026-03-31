import { useEffect, useState } from "react";
import { API_BASE } from "../lib/constants";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { useToast } from "../context/ToastContext";

type InviteInfo = {
  id: number;
  chat_id: number;
  invitee_email: string;
  message: string;
  status: string;
  title: string;
};

type InvitePageProps = {
  token: string;
  onDone: () => void;
  onLogin: () => void;
};

export function InvitePage({ token, onDone, onLogin }: InvitePageProps) {
  const { apiRequest, token: authToken } = useAuth();
  const { refreshChats } = useChat();
  const { notify } = useToast();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/invites/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.invite) {
          throw new Error(data.error || "Invite not found");
        }
        setInvite(data.invite);
      })
      .catch((err) => {
        setInvite(null);
        setError(err.message || "Unable to load invite");
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    if (!authToken) {
      notify("Login or register to accept the invite");
      onLogin();
      return;
    }

    try {
      const data = await apiRequest<{ chatId: number }>(
        `/api/invites/${token}/accept`,
        { method: "POST" },
      );
      await refreshChats(data.chatId);
      notify("Invite accepted");
      onDone();
    } catch (error) {
      notify((error as Error).message);
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-title">Chat invite</p>
          <p className="panel-sub">
            {loading
              ? "Loading invite..."
              : error
                ? "Invite details"
                : (invite?.title ?? "Invite details")}
          </p>
        </div>
      </div>
      <div className="panel-body">
        {loading ? (
          <p className="invite-message">Loading invite details…</p>
        ) : error ? (
          <p className="invite-message">{error}</p>
        ) : (
          <>
            <p className="invite-message">{invite?.message}</p>
            <p className="invite-meta">
              Invitee: {invite?.invitee_email ?? "—"}
            </p>
            <button className="primary" onClick={handleAccept}>
              Accept invite
            </button>
          </>
        )}
      </div>
      <div className="panel-actions">
        <button className="ghost" onClick={onLogin} type="button">
          {authToken ? "Back to login" : "Login to continue"}
        </button>
      </div>
    </div>
  );
}
