import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { getSessionUser, signOut, type SessionUser } from "./lib/auth";
import SignIn from "./pages/SignIn";
import Cockpit from "./pages/Cockpit";
import Hub from "./pages/Hub";
import Coverage from "./pages/Coverage";
import MarketOverview, { MarketDetail } from "./pages/Market";
import Competition, { CompetitionDetail } from "./pages/Competition";
import Budget from "./pages/Budget";
import FourP from "./pages/FourP";
import Health from "./pages/Health";
import Strategy from "./pages/Strategy";
import Decisions from "./pages/Decisions";
import Reports from "./pages/Reports";

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
      <a className="skip-link" href="#main">Skip to content</a>
      <Topbar user={user} onSignOut={async () => { await signOut(); setUser(null); }} />
      <main id="main">
        <Routes>
          <Route path="/" element={<Cockpit />} />
          <Route path="/sbu/:code" element={<Hub />} />
          <Route path="/coverage" element={<Coverage />} />
          <Route path="/market" element={<MarketOverview />} />
          <Route path="/market/:code" element={<MarketDetail />} />
          <Route path="/competition" element={<Competition />} />
          <Route path="/competition/:code" element={<CompetitionDetail />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/fourp" element={<FourP />} />
          <Route path="/health/:code" element={<Health />} />
          <Route path="/strategy/:code" element={<Strategy />} />
          <Route path="/decisions" element={<Decisions />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
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
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }} aria-label="Main navigation">
        <NavLink to="/" active={loc.pathname === "/"} label="Cockpit" />
        <NavLink to="/market" active={loc.pathname.startsWith("/market")} label="Market" />
        <NavLink to="/competition" active={loc.pathname.startsWith("/competition")} label="Competition" />
        <NavLink to="/budget" active={loc.pathname === "/budget"} label="Budget" />
        <NavLink to="/fourp" active={loc.pathname === "/fourp"} label="4P" />
        <NavLink to="/health/ACCL" active={loc.pathname.startsWith("/health")} label="Health" />
        <NavLink to="/strategy/ACCL" active={loc.pathname.startsWith("/strategy")} label="Strategy" />
        <NavLink to="/coverage" active={loc.pathname === "/coverage"} label="Coverage" />
        <NavLink to="/decisions" active={loc.pathname === "/decisions"} label="Decisions" />
        <NavLink to="/reports" active={loc.pathname === "/reports"} label="Reports" />
      </nav>
      <span className="spacer" />
      <span style={{ fontSize: 12, opacity: 0.8 }}>{user.email}</span>
      <button className="btn ghost" style={{ background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(255,255,255,.25)" }} onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}

function NavLink({ to, active, label }: { to: string; active: boolean; label: string }) {
  return (
    <Link to={to} style={{ color: active ? "#c9a227" : "#fff", textDecoration: "none", fontWeight: 700, fontSize: 13 }}>
      {label}
    </Link>
  );
}
