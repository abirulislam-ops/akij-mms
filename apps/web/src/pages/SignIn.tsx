import { useState } from "react";
import { authClient } from "../lib/auth";

type Mode = "signin" | "signup";

export default function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = mode === "signup"
        ? await authClient.signUp.email({ email, password, name: name || email.split("@")[0] })
        : await authClient.signIn.email({ email, password });
      if (res.error) throw new Error(res.error.message ?? "Authentication failed");
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0b1b33, #0f2a47)", padding: 16 }}>
      <div className="card" style={{ width: 380 }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
          AKIJ <span style={{ color: "#c9a227" }}>Resource</span> · MMS
        </div>
        <div style={{ fontSize: 12, color: "#5a6b7c", marginBottom: 18 }}>Marketing Management System</div>

        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          <button
            type="button"
            className={`sub ${mode === "signin" ? "active" : ""}`}
            style={{ flex: 1 }}
            onClick={() => { setMode("signin"); setError(""); }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`sub ${mode === "signup" ? "active" : ""}`}
            style={{ flex: 1 }}
            onClick={() => { setMode("signup"); setError(""); }}
          >
            Create account
          </button>
        </div>

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          {mode === "signup" && (
            <input type="text" required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <input type="email" required placeholder="Company email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required minLength={8} placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div style={{ color: "#a61c1c", fontSize: 12 }}>{error}</div>}
          <button className="btn gold" type="submit" disabled={busy}>
            {busy ? (mode === "signup" ? "Creating account…" : "Signing in…") : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        {mode === "signup" && (
          <div style={{ fontSize: 11, color: "#5a6b7c", marginTop: 12 }}>
            First time? Create your account with your company email — your access level (CBDO / Strategic Planning & Analysis) is already assigned.
          </div>
        )}
      </div>
    </div>
  );
}
