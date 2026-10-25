"use client";
import { useEffect, useState } from "react";
import type { IntroductionEditor } from "@/shared/p2-types";
import { introductionContent } from "@/shared/p2-validation";
import { ApiRequestError, api, errorText, formatDateTime, useResource } from "@/lib/client";
import { useIdentity } from "./app-shell";
import { Feedback, Tags } from "./ui";

// Owner-only, separate from the project form so a draft is never saved as project content.
export function IntroductionPanel({ projectId }: { projectId: string }) {
  const { userId } = useIdentity();
  const { data, error, loading, reload } = useResource<IntroductionEditor>(`/projects/${projectId}/introduction`, userId);
  const [sentences, setSentences] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [loadedDraft, setLoadedDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState<"" | "generate" | "confirm">("");
  const [failure, setFailure] = useState("");
  const [conflict, setConflict] = useState(false);
  const [success, setSuccess] = useState("");
  const draft = data?.draft;
  useEffect(() => {
    if (draft && draft.id !== loadedDraft) {
      setSentences(draft.sentences);
      setTags(draft.tags.join(", "));
      setLoadedDraft(draft.id);
      setDirty(false);
      setAttempted(false);
    }
  }, [draft, loadedDraft]);
  const content = { sentences, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) };
  const validation = introductionContent.safeParse(content);
  const issue = validation.success ? "" : validation.error.issues[0]?.message || "Check the introduction.";

  async function generate() {
    if (busy) return;
    if (dirty && !window.confirm("Replace your unsaved draft edits with a new generated draft? Your confirmed introduction stays as it is.")) return;
    setBusy("generate");
    setFailure("");
    setSuccess("");
    setConflict(false);
    try {
      await api<IntroductionEditor>(`/projects/${projectId}/introduction/generate`, userId, {});
      setLoadedDraft("");
      await reload();
      setSuccess("Draft ready. Only you can see it until you confirm it for browsing.");
    } catch (err) {
      setFailure(errorText(err));
    } finally {
      setBusy("");
    }
  }
  async function confirm() {
    if (busy || !data || !draft) return;
    setAttempted(true);
    if (!validation.success) return;
    setBusy("confirm");
    setFailure("");
    setSuccess("");
    try {
      await api<IntroductionEditor>(`/projects/${projectId}/introduction`, userId, { ...validation.data, draftId: draft.id, sourceHash: data.sourceHash }, "PATCH");
      setDirty(false);
      await reload();
      setSuccess("Confirmed. Browse cards now show this introduction.");
    } catch (err) {
      setConflict(err instanceof ApiRequestError && err.code === "DRAFT_CONFLICT");
      setFailure(`Couldn’t confirm. ${errorText(err)} Your edits are kept.`);
    } finally {
      setBusy("");
    }
  }
  const edit = (next: string[]) => {
    setSentences(next);
    setDirty(true);
  };
  const published = data?.published;
  const draftStale = !!draft && !!data && draft.sourceHash !== data.sourceHash;
  return (
    <section className="section-block intro-panel" aria-label="Browse introduction">
      <div className="section-heading">
        <div>
          <h2>Browse introduction</h2>
          <p>An optional short introduction for project cards, drafted by AI from your saved project and reviewed by you.</p>
        </div>
        <button className="button secondary" onClick={generate} disabled={!!busy || !data}>
          {busy === "generate" ? "Generating…" : draft || published ? "Generate new draft" : "Generate introduction"}
        </button>
      </div>
      <Feedback error={error || failure} success={success} />
      {conflict && (
        <button
          className="button secondary"
          onClick={() => {
            setConflict(false);
            setFailure("");
            setLoadedDraft("");
            void reload();
          }}
        >
          Load the newer draft
        </button>
      )}
      {loading && !data ? (
        <p className="subtle-empty" role="status">
          Loading introduction…
        </p>
      ) : data ? (
        <>
          {published && !published.stale ? (
            <div className="intro-published">
              <p className="ai-label">AI-assisted · owner-reviewed · confirmed {formatDateTime(published.reviewedAt)}</p>
              <p>{published.sentences.join(" ")}</p>
              <Tags tags={published.tags} />
            </div>
          ) : published ? (
            <p className="state-note">
              Your project changed after this introduction was confirmed. Browse cards show your own summary and tags until you generate and confirm a new one.
            </p>
          ) : (
            <p className="subtle-empty">Browse cards currently show your own summary and tags.</p>
          )}
          {draft && (
            <div className="intro-draft panel">
              <h3>Draft · only you can see this</h3>
              <p className="field-help">
                Generated {formatDateTime(draft.generatedAt)}. Edit anything, then confirm. Use one to three sentences, one per box, and one to six tags.
              </p>
              {draftStale && <p className="state-note">Your project changed after this draft was generated. Generate a new draft before confirming.</p>}
              {sentences.map((s, i) => (
                <div key={i} className="intro-field">
                  <label htmlFor={`intro-sentence-${projectId}-${i}`}>Sentence {i + 1}</label>
                  <span className="intro-row">
                    <textarea id={`intro-sentence-${projectId}-${i}`} rows={2} value={s} readOnly={!!busy} onChange={(e) => edit(sentences.map((v, j) => (j === i ? e.target.value : v)))} />
                    {sentences.length > 1 && (
                      <button type="button" className="text-button" aria-label={`Remove sentence ${i + 1}`} disabled={!!busy} onClick={() => edit(sentences.filter((_, j) => j !== i))}>
                        Remove
                      </button>
                    )}
                  </span>
                </div>
              ))}
              {sentences.length < 3 && (
                <button type="button" className="text-button" disabled={!!busy} onClick={() => edit([...sentences, ""])}>
                  + Add sentence
                </button>
              )}
              <label className="intro-field">
                Tags <span className="optional">(comma separated)</span>
                <input
                  value={tags}
                  readOnly={!!busy}
                  onChange={(e) => {
                    setTags(e.target.value);
                    setDirty(true);
                  }}
                />
              </label>
              {(attempted || dirty) && issue && (
                <p className="field-error" role="alert">
                  {issue}
                </p>
              )}
              <div className="inline-actions">
                <button className="button primary" onClick={confirm} disabled={!!busy || draftStale}>
                  {busy === "confirm" ? "Confirming…" : "Confirm for browsing"}
                </button>
              </div>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
