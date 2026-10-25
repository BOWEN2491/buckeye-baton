"use client";
import { useEffect } from "react";
import type { PriorityReason, ProjectPriorityDetail } from "@/shared/p3-types";
import { formatDateTime, useResource } from "@/lib/client";

// Reasons come from the server; the client never recomputes scores.
export function PriorityReasons({ reasons, projectId, limit }: { reasons: PriorityReason[]; projectId?: string; limit?: number }) {
  if (!reasons.length) return <p className="priority-none">No priority boost</p>;
  const item = (r: PriorityReason, i: number) => (
    <li key={`${r.code}-${r.questionId}-${i}`}>
      <span className="priority-points">+{r.points}</span>
      {r.questionId && projectId ? (
        <a className="text-link" href={`/projects/${projectId}#q-${r.questionId}`}>
          {r.label}
        </a>
      ) : (
        <span>{r.label}</span>
      )}
    </li>
  );
  const shown = limit ? reasons.slice(0, limit) : reasons;
  const rest = limit ? reasons.slice(limit) : [];
  return (
    <div className="priority-reasons">
      <ul>{shown.map(item)}</ul>
      {rest.length > 0 && (
        <details>
          <summary>All reasons ({reasons.length})</summary>
          <ul>{rest.map((r, i) => item(r, i + shown.length))}</ul>
        </details>
      )}
    </div>
  );
}

export function UpdatedRefresh({ asOf, loading, onRefresh }: { asOf?: string; loading: boolean; onRefresh: () => void }) {
  return (
    <p className="priority-updated">
      {asOf ? `Updated ${formatDateTime(asOf)}` : "Not loaded yet"}{" "}
      <button type="button" className="text-button" onClick={onRefresh} disabled={loading}>
        {loading ? "Refreshing…" : "Refresh"}
      </button>
    </p>
  );
}

export function PriorityRules() {
  return (
    <details className="priority-rules">
      <summary>How priority works</summary>
      <ul>
        <li>Paused projects nobody has picked up: +5 per full week since the project was shared, up to +20.</li>
        <li>Questions waiting for a referral or mentor reply: +5 per full day since the unanswered request was posted, up to +30. After a reply, a new follow-up starts a new wait.</li>
        <li>Reply dates do not affect priority. Ordinary comments do not add a priority boost.</li>
        <li>A project counts only its single highest question. These are fixed rules, not predictions.</li>
      </ul>
    </details>
  );
}

// Every mounted priority view on the page re-reads after a question, post, referral or date change.
const invalidated = "buckeye-baton:project-priority-invalidated";
export function invalidateProjectPriority() {
  window.dispatchEvent(new Event(invalidated));
}
export function useProjectPriority(projectId: string) {
  const resource = useResource<ProjectPriorityDetail>(`/projects/${projectId}/priority`);
  const { reload } = resource;
  useEffect(() => {
    const refresh = () => void reload();
    window.addEventListener(invalidated, refresh);
    return () => window.removeEventListener(invalidated, refresh);
  }, [reload]);
  return resource;
}
