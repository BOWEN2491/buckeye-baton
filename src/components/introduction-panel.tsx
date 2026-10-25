"use client";
import { useEffect, useState } from "react";
import type { P5IntroductionEditor } from "@/shared/p5-types";
import { introductionShape } from "@/shared/p2-validation";
import { ApiRequestError, api, errorText, formatDateTime, useResource } from "@/lib/client";
import { useIdentity } from "./app-shell";
import { Feedback, Tags } from "./ui";
import { AISources } from "./ai-sources";

export function IntroductionPanel({ projectId, onConfirmed }: { projectId: string; onConfirmed?: () => void | Promise<void> }) {
  const { userId } = useIdentity();
  const { data, error, loading, reload } = useResource<P5IntroductionEditor>(`/projects/${projectId}/introduction`, userId);
  const [sentences, setSentences] = useState<string[]>([]);
  const [loadedDraft, setLoadedDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState<"" | "generate" | "confirm">("");
  const [failure, setFailure] = useState("");
  const [conflict, setConflict] = useState(false);
  const [success, setSuccess] = useState("");
  const draft = data?.draft;
  const pending = data?.status === "pending" || data?.status === "processing";
  useEffect(() => {
    if (draft && draft.id !== loadedDraft) {
      setSentences(draft.sentences); setLoadedDraft(draft.id); setDirty(false); setAttempted(false);
    }
  }, [draft, loadedDraft]);
  useEffect(() => {
    if (!pending) return;
    const refresh = () => { if (document.visibilityState === "visible") void reload(); };
    const timer = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [pending, reload]);
  const validation = introductionShape.sentences.safeParse(sentences);
  const issue = validation.success ? "" : validation.error.issues[0]?.message || "Check the introduction.";
  async function generate() {
    if (busy || pending) return;
    if (dirty && !window.confirm("Replace your unsaved draft edits with a new generated draft?")) return;
    setBusy("generate"); setFailure(""); setSuccess(""); setConflict(false);
    try { await api<P5IntroductionEditor>(`/projects/${projectId}/introduction/generate`, userId, {}); await reload(); setSuccess("Generation queued. The draft stays private until you confirm it."); }
    catch (err) { setFailure(errorText(err)); }
    finally { setBusy(""); }
  }
  async function confirm() {
    if (busy || !data || !draft) return;
    setAttempted(true); if (issue) return;
    setBusy("confirm"); setFailure(""); setSuccess("");
    try {
      await api<P5IntroductionEditor>(`/projects/${projectId}/introduction`, userId, { sentences: sentences.map(s => s.trim()), draftId: draft.id, sourceHash: draft.sourceHash }, "PATCH");
      setDirty(false); await reload(); await onConfirmed?.(); setSuccess("Confirmed. Browse cards now show this introduction and its AI-generated topics.");
    } catch (err) { setConflict(err instanceof ApiRequestError && err.code === "DRAFT_CONFLICT"); setFailure(`Couldn’t confirm. ${errorText(err)} Your edits are kept.`); }
    finally { setBusy(""); }
  }
  const edit = (next: string[]) => { setSentences(next); setDirty(true); };
  const published = data?.published;
  const draftStale = !!draft && !!data && draft.sourceHash !== data.sourceHash;
  return <section className="section-block intro-panel" aria-label="Browse introduction">
    <div className="section-heading"><div><h2>Browse introduction</h2><p>AI uses your public GitHub repository and saved project progress. Review the introduction and generated topics before publishing.</p></div>
      <button className="button secondary" onClick={() => void generate()} disabled={!!busy || !data || pending}>{busy === "generate" ? "Queuing…" : pending ? "Analysis in progress…" : draft || published ? "Generate new draft" : "Generate introduction"}</button>
    </div>
    <Feedback error={error || failure || data?.error?.message} success={success} />
    {error && <button type="button" className="text-button" onClick={() => void reload()}>Retry loading introduction</button>}
    {conflict && <button className="button secondary" onClick={() => { setConflict(false); setFailure(""); setLoadedDraft(""); void reload(); }}>Load the newer draft</button>}
    {loading && !data ? <p className="subtle-empty" role="status">Loading introduction…</p> : data ? <>
      {pending && <p className="state-note" role="status">{data.status === "processing" ? "Reading sources and preparing your draft…" : "Generation queued. Your saved project is safe."} This panel checks for the result automatically.</p>}
      {published && !published.stale ? <div className="intro-published"><p className="ai-label">AI-assisted · owner-reviewed · confirmed {formatDateTime(published.reviewedAt)}</p><p>{published.sentences.join(" ")}</p><p className="field-help">Topics</p><Tags tags={published.topics} /><p className="field-help">Technologies</p>{published.technologies.length ? <Tags tags={published.technologies} /> : <p className="field-help">No technologies identified.</p>}<AISources sources={published.sources} /></div> : <p className="subtle-empty">{published?.stale ? "Your project changed. " : ""}Browse cards show your original summary. Topics pending review.</p>}
      {data.status === "failed" && <button type="button" className="button secondary" disabled={!!busy} onClick={() => void generate()}>Retry generation</button>}
      {draft && <div className="intro-draft panel"><h3>Draft · only you can see this</h3><p className="field-help">Generated {formatDateTime(draft.generatedAt)}. Edit one to three sentences, then confirm. Topics and technologies are generated from the sources and cannot be edited.</p>
        {draftStale && <p className="state-note">Your project changed after this draft was generated. Wait for a current draft before confirming.</p>}
        {sentences.map((sentence, index) => <div key={index} className="intro-field"><label htmlFor={`intro-sentence-${projectId}-${index}`}>Sentence {index + 1}</label><span className="intro-row"><textarea id={`intro-sentence-${projectId}-${index}`} rows={2} maxLength={280} value={sentence} readOnly={!!busy} onChange={event => edit(sentences.map((value, i) => i === index ? event.target.value : value))} />{sentences.length > 1 && <button type="button" className="text-button" aria-label={`Remove sentence ${index + 1}`} disabled={!!busy} onClick={() => edit(sentences.filter((_, i) => i !== index))}>Remove</button>}</span></div>)}
        {sentences.length < 3 && <button type="button" className="text-button" disabled={!!busy} onClick={() => edit([...sentences, ""])}>+ Add sentence</button>}
        <div aria-label="Generated labels"><h4>Topics</h4><Tags tags={draft.topics} /><h4>Technologies</h4>{draft.technologies.length ? <Tags tags={draft.technologies} /> : <p className="field-help">No technologies identified.</p>}</div>
        <AISources sources={draft.sources} />
        {(attempted || dirty) && issue && <p className="field-error" role="alert">{issue}</p>}
        <button className="button primary" onClick={() => void confirm()} disabled={!!busy || pending || draftStale}>{busy === "confirm" ? "Confirming…" : "Confirm for browsing"}</button>
      </div>}
      {!draft && data.sources && <AISources sources={data.sources} />}
    </> : null}
  </section>;
}
