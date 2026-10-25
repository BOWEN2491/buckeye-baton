"use client";
import { useEffect, useState } from "react";
import type { QuestionRecommendations } from "@/shared/p5-types";
import { EXPERTISE } from "@/shared/p5-types";
import { api, errorText, formatDateTime, useResource } from "@/lib/client";
import { useIdentity } from "./app-shell";
import { Feedback, Tags } from "./ui";

export function MentorRecommendations({ questionId, selected, disabled, onSelect }: { questionId: string; selected: string; disabled: boolean; onSelect: (id: string) => void }) {
  const { userId } = useIdentity();
  const { data, error, loading, reload } = useResource<QuestionRecommendations>(`/project-questions/${questionId}/recommendations`, userId);
  const [failure, setFailure] = useState("");
  const [retrying, setRetrying] = useState(false);
  const pending = data?.status === "pending" || data?.status === "processing";
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void reload(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("buckeye-baton:mentor-workload-invalidated", refresh);
    window.addEventListener("buckeye-baton:expertise-updated", refresh);
    const timer = pending ? window.setInterval(refresh, 5000) : undefined;
    return () => { window.removeEventListener("focus", refresh); window.removeEventListener("buckeye-baton:mentor-workload-invalidated", refresh); window.removeEventListener("buckeye-baton:expertise-updated", refresh); if (timer) clearInterval(timer); };
  }, [reload, pending]);
  async function retry() {
    setRetrying(true); setFailure("");
    try { await api(`/project-questions/${questionId}/analysis/retry`, userId, {}); await reload(); }
    catch (err) { setFailure(errorText(err)); }
    finally { setRetrying(false); }
  }
  const ready = !error && data?.status === "ready";
  return <section className="mentor-recommendations" aria-label="Suggested mentors">
    <div className="section-heading"><div><h3>Suggested mentors</h3><p className="field-help">AI relevance to this question, with current Awaiting reply counts. You choose who to refer.</p></div><button type="button" className="text-button" onClick={() => void reload()} disabled={loading}>{loading ? "Refreshing…" : "Refresh suggestions"}</button></div>
    <Feedback error={error || failure || data?.error?.message} />
    {!data && !error && <p role="status">Loading suggestions…</p>}
    {pending && <p role="status">{data.status === "processing" ? "Analyzing the question…" : "Analysis queued…"} You can still choose any mentor below.</p>}
    {data && !pending && !ready && <><p className="subtle-empty">{data.status === "stale" ? "The question changed. Previous suggestions are no longer current." : "No current analysis is available."} Manual referral is available below.</p><button type="button" className="button secondary" onClick={() => void retry()} disabled={retrying}>{retrying ? "Queuing…" : "Retry analysis"}</button></>}
    {ready && <>
      {data.candidates.length ? <div className="mentor-candidates">{data.candidates.map(candidate => <article key={candidate.mentor.id} className={selected === candidate.mentor.id ? "mentor-candidate selected" : "mentor-candidate"}>
        <h4>{candidate.mentor.name}</h4><Tags tags={candidate.matchedExpertise} /><p><strong>Relevance: {candidate.score}/100</strong>{candidate.lowRelevance && <span className="role-chip">Low relevance</span>}</p><p className="workload-count">Awaiting reply: {candidate.awaitingReply}</p><p>{candidate.reason}</p><button type="button" className="button secondary" disabled={disabled} aria-pressed={selected === candidate.mentor.id} onClick={() => onSelect(candidate.mentor.id)}>{selected === candidate.mentor.id ? "Selected" : `Choose ${candidate.mentor.name}`}</button>
      </article>)}</div> : <p className="subtle-empty">No mentors have matching expertise yet. Choose from all mentors below.</p>}
      {data.scores && <details><summary>Question expertise scores</summary><p className="field-help">Independent relevance scores; these are not probabilities of solving the question.</p><ul>{EXPERTISE.map(expertise => <li key={expertise}><strong>{expertise}: {data.scores![expertise].score}/100</strong> — {data.scores![expertise].reason}</li>)}</ul></details>}
      <p className="metadata">Updated {formatDateTime(data.asOf)}</p>
    </>}
    {error && <button type="button" className="text-button" onClick={() => void reload()}>Retry suggestions</button>}
    <a className="text-link" href={`#all-mentors-${questionId}`}>View all mentors</a>
  </section>;
}
