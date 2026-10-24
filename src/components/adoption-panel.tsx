"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { Adoption, LessonDetail, Project } from "@/shared/types";
import { api, useResource } from "@/lib/client";
import { useIdentity, Icon } from "./app-shell";
import { Feedback } from "./ui";
export function AdoptionPanel({
  detail,
  onSaved,
}: {
  detail: LessonDetail;
  onSaved: () => Promise<void>;
}) {
  const { user, userId } = useIdentity();
  const { data: projects = [] } = useResource<Project[]>("/projects", userId);
  const own = projects.filter(
    (p) => p.ownerId === userId && p.id !== detail.project.id,
  );
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const projectId = selected || own[0]?.id || "";
  const adoption = detail.adoptions.find(
    (a) => a.adoptingProjectId === projectId,
  );
  async function save() {
    setBusy(true);
    setError("");
    try {
      await api<Adoption>(`/lessons/${detail.lesson.id}/adoptions`, userId, {
        adoptingProjectId: projectId,
      });
      setSuccess("Saved to your project. Report back after you try it.");
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function report(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!adoption) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await api(
        `/adoptions/${adoption.id}`,
        userId,
        {
          result: f.get("result"),
          note: f.get("note"),
          artifactUrl: f.get("artifactUrl") || null,
        },
        "PATCH",
      );
      setSuccess("Your result is part of this lesson’s story.");
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside>
      <div className="panel adoption-panel">
        <span className="accent-icon">
          <Icon name="relay" size={25} />
        </span>
        <h2>{user?.role === "student" ? "Use this lesson in your project" : "How teams used this lesson"}</h2>
        <p>{user?.role === "student"
          ? "Save this specific lesson to a project you own. After trying it, return here to share what worked or needed adapting."
          : "Students can save this lesson to their projects and report what happened after trying it."}</p>
        <div className="adoption-stats">
          <strong>{detail.stats.total}</strong>
          <span>
            project{detail.stats.total !== 1 ? "s" : ""} reported an outcome
          </span>
        </div>
        <div className="outcome-summary">
          <span>{detail.stats.worked} worked</span>
          <span>{detail.stats.partial} adapted</span>
          <span>{detail.stats.failed} different outcome</span>
        </div>
        <Feedback error={error} success={success} />
        {user?.role === "student" ? (
          own.length ? (
            <div className="form-stack">
              <label>
                Your project
                <select
                  value={projectId}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setSuccess("");
                  }}
                >
                  {own.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
              {!adoption && <p className="field-help">Saving links this lesson to your project. It counts as used only after you report a result.</p>}
              {!adoption ? (
                <button
                  className="button primary full-width"
                  disabled={busy}
                  onClick={() => void save()}
                >
                  {busy ? "Saving…" : "Add to my project"}
                </button>
              ) : (
                <form
                  className="form-stack report-form"
                  onSubmit={report}
                  key={adoption.id}
                >
                  <div className="saved-note">✓ Saved to this project</div>
                  <p className="field-help">Try it first, then fill in the result below. You can leave now and return to this lesson later.</p>
                  <label>
                    What happened?
                    <select
                      aria-label="What happened?"
                      name="result"
                      defaultValue={adoption.result || "worked"}
                    >
                      <option value="worked">Worked for our team</option>
                      <option value="partial">Worked after adapting</option>
                      <option value="failed">Didn’t work in our context</option>
                    </select>
                  </label>
                  <label>
                    Your result
                    <textarea
                      aria-label="Your result"
                      name="note"
                      required
                      rows={4}
                      defaultValue={adoption.note}
                      placeholder="What did you try? What did you change or observe?"
                    />
                  </label>
                  <label>
                    Evidence link <span className="optional">optional</span>
                    <input
                      name="artifactUrl"
                      type="url"
                      defaultValue={adoption.artifactUrl || ""}
                      placeholder="https://"
                    />
                  </label>
                  <button className="button primary full-width" disabled={busy}>
                    {busy
                      ? "Saving…"
                      : adoption.result
                        ? "Update result"
                        : "Share result"}
                  </button>
                  <p className="field-help">
                    Only reported results count toward projects helped.
                  </p>
                </form>
              )}
            </div>
          ) : (
            <div className="subtle-empty">
              Create a project to save and try this lesson.
              <Link href="/projects/new" className="text-link">
                Create project →
              </Link>
            </div>
          )
        ) : (
          <p className="field-help">
            Switch to a student identity to try this lesson in a project.
          </p>
        )}
      </div>
    </aside>
  );
}
