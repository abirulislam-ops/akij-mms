import { useState } from "react";
import { authClient } from "../lib/auth";

export default function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) throw new Error(res.error.message ?? "Sign-in failed");
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0b1b33, #0f2a47)" }}>
      <div className="card" style={{ width: 360 }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
          AKIJ <span style={{ color: "#c9a227" }}>Resource</span> · MMS
        </div>
        <div style={{ fontSize: 12, color: "#5a6b7c", marginBottom: 18 }}>Marketing Management System — sign in</div>
        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <input type="email" required placeholder="Company email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div style={{ color: "#a61c1c", fontSize: 12 }}>{error}</div>}
          <button className="btn gold" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
      </div>
    </div>
  );
}
