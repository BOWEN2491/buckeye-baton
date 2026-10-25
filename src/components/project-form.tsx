"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type {
  Project,
  ProjectInput,
  ProjectReflection,
  ProjectStatus,
} from "@/shared/types";
import { api } from "@/lib/client";
import { useIdentity } from "./app-shell";
import { Feedback } from "./ui";
const emptyReflection = (): ProjectReflection => ({
  progress: "",
  outcomes: [],
  problems: [],
  nextTeam: "",
  whyPaused: "",
  ifAgain: [],
  reusable: [],
});
export function ProjectForm({
  project,
  onSaved,
  onCancel,
}: {
  project?: Project;
  onSaved?: (project: Project) => void | Promise<void>;
  onCancel?: () => void;
}) {
  const { user, userId } = useIdentity();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<ProjectStatus>(
    project?.status || "ongoing",
  );
  const [reflection, setReflection] = useState<ProjectReflection>(() =>
    project?.reflection
      ? structuredClone(project.reflection)
      : emptyReflection(),
  );
  function field<K extends keyof ProjectReflection>(
    key: K,
    value: ProjectReflection[K],
  ) {
    setReflection((r) => ({ ...r, [key]: value }));
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const normalized = {
      ...reflection,
      outcomes: reflection.outcomes.map((s) => s.trim()).filter(Boolean),
      ifAgain: reflection.ifAgain.map((s) => s.trim()).filter(Boolean),
      problems: reflection.problems.filter((p) =>
        Object.values(p).some((s) => s.trim()),
      ),
      reusable: reflection.reusable
        .filter((v) => v.label.trim() || v.url?.trim())
        .map((v) => ({ label: v.label.trim(), url: v.url?.trim() || null })),
    };
    if (
      status === "finished" &&
      (!normalized.outcomes.length || !normalized.nextTeam.trim())
    ) {
      setError(
        "Finished projects need at least one outcome and advice for the next team.",
      );
      return;
    }
    if (
      status === "paused" &&
      (!normalized.whyPaused.trim() || !normalized.ifAgain.length)
    ) {
      setError(
        "Paused projects need a reason and at least one restart suggestion.",
      );
      return;
    }
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const input: ProjectInput = {
      title: String(f.get("title")),
      summary: String(f.get("summary")),
      courseOrClub: String(f.get("courseOrClub")),
      term: String(f.get("term")),
      status,
      tags: String(f.get("tags"))
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      demoUrl: String(f.get("demoUrl")) || null,
      codeUrl: String(f.get("codeUrl")) || null,
      reflection: normalized,
    };
    try {
      const p = await api<Project>(
        project ? `/projects/${project.id}` : "/projects",
        userId,
        input,
        project ? "PATCH" : "POST",
      );
      if (onSaved) await onSaved(p);
      else router.push(`/projects/${p.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (user?.role !== "student" || (project && project.ownerId !== userId))
    return (
      <Feedback error="Only the student who owns this project can edit it. Switch to a student demo identity to publish a project." />
    );
  return (
    <form
      onSubmit={submit}
      className="form-stack panel project-editor"
      aria-label={project ? "Edit project" : "Create project"}
    >
      <h2>{project ? "Edit project" : "Project details"}</h2>
      {project?.reflection === null && (
        <p className="subtle-empty">
          Your historical experience is retained. Add the required team summary
          before saving this project as Finished or Paused, or return it to
          Ongoing.
        </p>
      )}
      <label>
        Project name
        <input
          name="title"
          required
          maxLength={160}
          defaultValue={project?.title}
          placeholder="Give your project a clear name"
        />
      </label>
      <label>
        What did you set out to do?
        <textarea
          name="summary"
          required
          rows={4}
          defaultValue={project?.summary}
          placeholder="The problem, the people you built for, and your approach."
        />
      </label>
      <div className="form-row">
        <label>
          Course or club
          <input
            name="courseOrClub"
            required
            defaultValue={project?.courseOrClub}
            placeholder="e.g. CSE 5914"
          />
        </label>
        <label>
          Term
          <input
            name="term"
            required
            defaultValue={project?.term}
            placeholder="e.g. Autumn 2026"
          />
        </label>
      </div>
      <label>
        Topics
        <input
          name="tags"
          defaultValue={project?.tags.join(", ")}
          placeholder="web development, accessibility"
        />
        <span className="field-help">Separate topics with commas.</span>
      </label>
      <div className="form-row">
        <label>
          Demo link <span className="optional">optional</span>
          <input
            aria-label="Demo link"
            name="demoUrl"
            type="url"
            defaultValue={project?.demoUrl || ""}
            placeholder="https://"
          />
        </label>
        <label>
          Code link <span className="optional">optional</span>
          <input
            aria-label="Code link"
            name="codeUrl"
            type="url"
            defaultValue={project?.codeUrl || ""}
            placeholder="https://github.com/…"
          />
        </label>
      </div>
      {project ? (
        <label>
          Project status
          <select
            aria-label="Project status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
          >
            <option value="ongoing">Ongoing</option>
            <option value="finished">Finished</option>
            <option value="paused">Paused</option>
          </select>
          <span className="field-help">
            The status changes when you save. Previous reflections and
            historical records are kept.
          </span>
        </label>
      ) : (
        <p className="muted">
          New projects start as Ongoing. Add team reflections before finishing
          or pausing.
        </p>
      )}
      {status === "ongoing" && <label>
        Current progress
        <textarea
          aria-label="Current progress"
          rows={3}
          value={reflection.progress}
          onChange={(e) => field("progress", e.target.value)}
          placeholder="What is working, and what are you trying next?"
        />
      </label>}
      {project && (
        <>
          {status === "finished" && <fieldset className="reflection-fields">
            <legend>Finished · team reflections</legend>
            <p className="field-help">
              Required when saving as Finished: one outcome and advice for the
              next team.
            </p>
            <TextList
              label="Outcome"
              values={reflection.outcomes}
              addLabel="Add outcome"
              removeLabel="Remove outcome"
              onChange={(v) => field("outcomes", v)}
            />
            <h3>Problems we encountered</h3>
            {reflection.problems.map((p, i) => (
              <div className="repeat-item form-stack" key={i}>
                {(["title", "assumed", "happened", "changed"] as const).map(
                  (key) => {
                    const label = {
                      title: "Problem title",
                      assumed: "We assumed",
                      happened: "What happened",
                      changed: "We changed",
                    }[key];
                    return (
                      <label key={key}>
                        {label} {i + 1}
                        <textarea
                          aria-label={`${label} ${i + 1}`}
                          rows={2}
                          value={p[key]}
                          onChange={(e) =>
                            field(
                              "problems",
                              reflection.problems.map((v, n) =>
                                n === i ? { ...v, [key]: e.target.value } : v,
                              ),
                            )
                          }
                        />
                      </label>
                    );
                  },
                )}
                <button
                  type="button"
                  className="text-button"
                  aria-label={`Remove problem ${i + 1}`}
                  onClick={() =>
                    field(
                      "problems",
                      reflection.problems.filter((_, n) => n !== i),
                    )
                  }
                >
                  Remove problem
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                field("problems", [
                  ...reflection.problems,
                  { title: "", assumed: "", happened: "", changed: "" },
                ])
              }
            >
              Add problem
            </button>
            <label>
              For the next team
              <textarea
                aria-label="For the next team"
                rows={3}
                value={reflection.nextTeam}
                onChange={(e) => field("nextTeam", e.target.value)}
              />
            </label>
          </fieldset>}
          {status === "paused" && <fieldset className="reflection-fields">
            <legend>Paused · handoff notes</legend>
            <p className="field-help">
              Required when saving as Paused: why you paused and one restart
              suggestion.
            </p>
            <label>
              Why we paused
              <textarea
                aria-label="Why we paused"
                rows={3}
                value={reflection.whyPaused}
                onChange={(e) => field("whyPaused", e.target.value)}
              />
            </label>
            <TextList
              label="If we did it again"
              values={reflection.ifAgain}
              addLabel="Add restart suggestion"
              removeLabel="Remove restart suggestion"
              onChange={(v) => field("ifAgain", v)}
            />
            <h3>What you can reuse</h3>
            {reflection.reusable.map((v, i) => (
              <div className="repeat-item form-stack" key={i}>
                <label>
                  Reusable name {i + 1}
                  <input
                    aria-label={`Reusable name ${i + 1}`}
                    value={v.label}
                    onChange={(e) =>
                      field(
                        "reusable",
                        reflection.reusable.map((a, n) =>
                          n === i ? { ...a, label: e.target.value } : a,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Reusable URL {i + 1}{" "}
                  <span className="optional">optional</span>
                  <input
                    aria-label={`Reusable URL ${i + 1}`}
                    type="url"
                    value={v.url || ""}
                    onChange={(e) =>
                      field(
                        "reusable",
                        reflection.reusable.map((a, n) =>
                          n === i ? { ...a, url: e.target.value || null } : a,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="text-button"
                  aria-label={`Remove reusable material ${i + 1}`}
                  onClick={() =>
                    field(
                      "reusable",
                      reflection.reusable.filter((_, n) => n !== i),
                    )
                  }
                >
                  Remove reusable material
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                field("reusable", [
                  ...reflection.reusable,
                  { label: "", url: null },
                ])
              }
            >
              Add reusable material
            </button>
          </fieldset>}
        </>
      )}
      <Feedback error={error} />
      <div className="form-actions">
        <p>Saved as {user.name} in this demo.</p>
        <div className="inline-actions">
          {onCancel && (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={onCancel}
            >
              Cancel editing
            </button>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : project ? "Save changes" : "Publish project"}
          </button>
        </div>
      </div>
    </form>
  );
}
function TextList({
  label,
  values,
  addLabel,
  removeLabel,
  onChange,
}: {
  label: string;
  values: string[];
  addLabel: string;
  removeLabel: string;
  onChange: (values: string[]) => void;
}) {
  return (
    <>
      {values.map((v, i) => (
        <div className="repeat-item" key={i}>
          <label>
            {label} {i + 1}
            <textarea
              aria-label={`${label} ${i + 1}`}
              value={v}
              onChange={(e) =>
                onChange(values.map((a, n) => (n === i ? e.target.value : a)))
              }
            />
          </label>
          <button
            type="button"
            className="text-button"
            aria-label={`${removeLabel} ${i + 1}`}
            onClick={() => onChange(values.filter((_, n) => n !== i))}
          >
            {removeLabel}
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button secondary"
        onClick={() => onChange([...values, ""])}
      >
        {addLabel}
      </button>
    </>
  );
}
