import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { getSessionUser, signOut, type SessionUser } from "./lib/auth";
import SignIn from "./pages/SignIn";
import Cockpit from "./pages/Cockpit";
import Hub from "./pages/Hub";

export default function App() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    getSessionUser().then(setUser).catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return <div style={{ padding: 40 }}>Loading…</div>;
  }

  if (user === null) {
    return <SignIn onSignedIn={() => getSessionUser().then(setUser)} />;
  }

  return (
    <>
      <Topbar user={user} onSignOut={async () => { await signOut(); setUser(null); }} />
      <Routes>
        <Route path="/" element={<Cockpit />} />
        <Route path="/sbu/:code" element={<Hub />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function Topbar({ user, onSignOut }: { user: SessionUser; onSignOut: () => void }) {
  const loc = useLocation();
  return (
    <div className="topbar">
      <span className="brand">
        AKIJ <b>Resource</b> <span style={{ fontWeight: 400, opacity: 0.7 }}>· MMS</span>
      </span>
      <nav style={{ display: "flex", gap: 8 }}>
        <Link to="/" style={{ color: loc.pathname === "/" ? "#c9a227" : "#fff", textDecoration: "none", fontWeight: 700 }}>Cockpit</Link>
      </nav>
      <span className="spacer" />
      <span style={{ fontSize: 12, opacity: 0.8 }}>{user.email}</span>
      <button className="btn ghost" style={{ background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(255,255,255,.25)" }} onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}
