import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { useToast } from "./context/ToastContext";
import { Sidebar } from "./components/Sidebar";
import { Toast } from "./components/Toast";
import { AuthPage } from "./pages/AuthPage";
import { InvitePage } from "./pages/InvitePage";
import { ChatPage } from "./pages/ChatPage";
import { NewChatPage } from "./pages/NewChatPage";
import { NewDirectChatPage } from "./pages/NewDirectChatPage";
import { ProfilePage } from "./pages/ProfilePage";
import { FilesPage } from "./pages/FilesPage";
import { CallsPage } from "./pages/CallsPage";
import { DetailsPage } from "./pages/DetailsPage";
import { AddMemberPage } from "./pages/AddMemberPage";

type View =
  | "chat"
  | "new"
  | "profile"
  | "direct"
  | "files"
  | "calls"
  | "details"
  | "member"
  | "auth"
  | "invite";

function App() {
  const { token, logout } = useAuth();
  const { notify } = useToast();
  const initialInviteToken =
    window.location.pathname.match(/\/invite\/(.+)$/)?.[1] ?? null;
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("nextalk_theme");
    return saved === "dark" ? "dark" : "light";
  });
  const [activeView, setActiveView] = useState<View>(() =>
    initialInviteToken ? "invite" : token ? "chat" : "auth",
  );
  const [inviteToken] = useState<string | null>(initialInviteToken);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("nextalk_theme", theme);
  }, [theme]);

  function requireAuth(nextView: View) {
    if (!token) {
      notify("Login to continue");
      setActiveView("auth");
      return;
    }
    setActiveView(nextView);
    setSidebarOpen(false);
  }

  function handleLogout() {
    logout();
    setActiveView("auth");
    setSidebarOpen(false);
  }

  const showInvite = activeView === "invite" && inviteToken;
  const showAuth = !token && activeView !== "invite";

  return (
    <div className="app-root">
      {(showAuth || showInvite) && (
        <div className="auth-page">
          <main className="auth-page-main">
            {showAuth && (
              <AuthPage
                onDone={() => setActiveView(inviteToken ? "invite" : "chat")}
              />
            )}
            {showInvite && inviteToken && (
              <InvitePage
                token={inviteToken}
                onDone={() => setActiveView("chat")}
                onLogin={() => setActiveView("auth")}
              />
            )}
          </main>
        </div>
      )}

      {token && activeView !== "auth" && activeView !== "invite" && (
        <div className="app-shell">
          <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onProfile={() => requireAuth("profile")}
            onNewChat={() => requireAuth("new")}
            onDirectChat={() => requireAuth("direct")}
            onAddMember={() => requireAuth("member")}
            theme={theme}
            onToggleTheme={() =>
              setTheme((prev) => (prev === "light" ? "dark" : "light"))
            }
            onLogout={handleLogout}
          />
          <main className="chat-stage">
            {activeView === "chat" && (
              <ChatPage
                onFiles={() => setActiveView("files")}
                onCalls={() => setActiveView("calls")}
                onDetails={() => setActiveView("details")}
                onMenuToggle={() => setSidebarOpen((prev) => !prev)}
              />
            )}
            {activeView === "new" && (
              <NewChatPage onBack={() => setActiveView("chat")} />
            )}
            {activeView === "direct" && (
              <NewDirectChatPage onBack={() => setActiveView("chat")} />
            )}
            {activeView === "profile" && (
              <ProfilePage onBack={() => setActiveView("chat")} />
            )}
            {activeView === "files" && (
              <FilesPage onBack={() => setActiveView("chat")} />
            )}
            {activeView === "calls" && (
              <CallsPage onBack={() => setActiveView("chat")} />
            )}
            {activeView === "details" && (
              <DetailsPage onBack={() => setActiveView("chat")} />
            )}
            {activeView === "member" && (
              <AddMemberPage onBack={() => setActiveView("chat")} />
            )}
          </main>
        </div>
      )}

      <Toast />
    </div>
  );
}

export default App;
