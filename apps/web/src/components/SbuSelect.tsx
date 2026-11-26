import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface SbuOption {
  code: string;
  name: string;
}

/**
 * Global SBU selector. Picks an SBU and navigates to `base` + code.
 * Present on every per-SBU module screen (blueprint: "SBU dropdown on every screen").
 */
export default function SbuSelect({ base, value }: { base: string; value: string | undefined }) {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["sbus"],
    queryFn: () => apiFetch<{ sbus: SbuOption[] }>("/api/sbus"),
  });

  const sbus = data?.sbus ?? [];
  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        if (e.target.value) navigate(`${base}/${e.target.value}`);
      }}
      style={{ fontWeight: 700 }}
    >
      <option value="" disabled>Select SBU…</option>
      {sbus.map((s) => (
        <option key={s.code} value={s.code}>{s.name}</option>
      ))}
    </select>
  );
}
