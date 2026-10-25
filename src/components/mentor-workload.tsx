"use client";
import { useEffect } from "react";
import type { MentorWorkloadResult } from "@/shared/p2-types";
import type { User } from "@/shared/types";
import { formatDateTime, useResource } from "@/lib/client";
import { useIdentity } from "./app-shell";

// Each mount reads fresh counts; Staff refresh manually, and a successful referral tells every
// mounted view on the page to re-read. A failed read never shows as 0.
const invalidated = "buckeye-baton:mentor-workload-invalidated";
export function invalidateMentorWorkload() {
  window.dispatchEvent(new Event(invalidated));
}
export function useMentorWorkload() {
  const { userId } = useIdentity();
  const resource = useResource<MentorWorkloadResult>("/mentors/workload", userId);
  const { reload } = resource;
  useEffect(() => {
    const refresh = () => void reload();
    window.addEventListener(invalidated, refresh);
    return () => window.removeEventListener(invalidated, refresh);
  }, [reload]);
  return resource;
}
function Unavailable({ onRetry, loading }: { onRetry: () => void; loading: boolean }) {
  return (
    <p className="workload-unavailable" role="status">
      Workload unavailable.{" "}
      <button type="button" className="text-button" onClick={onRetry} disabled={loading}>
        {loading ? "Retrying…" : "Retry"}
      </button>
    </p>
  );
}

export function MentorWorkloadPanel() {
  const { data, error, loading, reload } = useMentorWorkload();
  return (
    <section className="panel workload-panel" aria-label="Mentor workload">
      <div className="section-heading">
        <div>
          <h2>Mentor workload</h2>
          <p>How many referred questions are waiting for each mentor’s reply. This is not availability or a ranking.</p>
        </div>
        <button className="button secondary" onClick={() => void reload()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {error ? (
        <Unavailable onRetry={() => void reload()} loading={loading} />
      ) : !data ? (
        <p className="subtle-empty" role="status">
          Loading workload…
        </p>
      ) : data.items.length ? (
        <>
          <ul className="workload-list">
            {data.items.map((i) => (
              <li key={i.mentor.id}>
                <span>
                  <strong>{i.mentor.name}</strong>
                  <span className="metadata"> · {i.mentor.headline}</span>
                  <span className="field-help">{i.mentor.expertise?.length ? i.mentor.expertise.join(" · ") : "Expertise not set"}</span>
                </span>
                <span className="workload-count">Awaiting reply: {i.awaitingReply}</span>
              </li>
            ))}
          </ul>
          <p className="field-help">Updated {formatDateTime(data.asOf)}</p>
        </>
      ) : (
        <p className="subtle-empty">No mentors in the directory yet.</p>
      )}
    </section>
  );
}

// Referral candidates with counts; the directory still works when counts cannot be read.
export function MentorSelect({ mentors, value, disabled, onChange }: { mentors: User[]; value: string; disabled: boolean; onChange: (id: string) => void }) {
  const { data, error, loading, reload } = useMentorWorkload();
  const counts = error ? null : data ? new Map(data.items.map((i) => [i.mentor.id, i.awaitingReply])) : null;
  return (
    <>
      <label>
        Mentor
        <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose a mentor</option>
          {mentors.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · {m.expertise?.length ? m.expertise.join(", ") : "Expertise not set"}
              {counts?.has(m.id) ? ` · Awaiting reply: ${counts.get(m.id)}` : ""}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <Unavailable onRetry={() => void reload()} loading={loading} />
      ) : (
        <span className="field-help workload-asof">
          {data ? `Awaiting reply counts as of ${formatDateTime(data.asOf)}. You still choose the mentor.` : "Loading Awaiting reply counts…"}{" "}
          <button type="button" className="text-button" onClick={() => void reload()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh counts"}
          </button>
        </span>
      )}
    </>
  );
}
