"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Project, ProjectInput } from "@/shared/types";
import { api } from "@/lib/client";
import { useIdentity } from "./app-shell";
import { Feedback } from "./ui";
export function ProjectForm() {
  const { user, userId } = useIdentity();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const input: ProjectInput = {
      title: String(f.get("title")),
      summary: String(f.get("summary")),
      courseOrClub: String(f.get("courseOrClub")),
      term: String(f.get("term")),
      status: String(f.get("status")) as ProjectInput["status"],
      tags: String(f.get("tags"))
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      demoUrl: String(f.get("demoUrl")) || null,
      codeUrl: String(f.get("codeUrl")) || null,
    };
    try {
      const p = await api<Project>("/projects", userId, input);
      router.push(`/projects/${p.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (user?.role !== "student")
    return (
      <Feedback error="Switch to a student demo identity to publish a project." />
    );
  return (
    <form onSubmit={submit} className="form-stack panel">
      <label>
        Project name
        <input
          name="title"
          required
          maxLength={160}
          placeholder="Give your project a clear name"
        />
      </label>
      <label>
        What did you set out to do?
        <textarea
          name="summary"
          required
          rows={4}
          placeholder="The problem, the people you built for, and your approach."
        />
      </label>
      <div className="form-row">
        <label>
          Course or club
          <input name="courseOrClub" required placeholder="e.g. CSE 5914" />
        </label>
        <label>
          Term
          <input name="term" required placeholder="e.g. Autumn 2026" />
        </label>
      </div>
      <div className="form-row">
        <label>
          Status
          <select name="status">
            <option value="ongoing">Ongoing</option>
            <option value="finished">Finished</option>
            <option value="paused">Paused</option>
          </select>
        </label>
        <label>
          Topics
          <input name="tags" placeholder="web development, accessibility" />
          <span className="field-help">Separate topics with commas.</span>
        </label>
      </div>
      <div className="form-row">
        <label>
          Demo link <span className="optional">optional</span>
          <input name="demoUrl" type="url" placeholder="https://" />
        </label>
        <label>
          Code link <span className="optional">optional</span>
          <input name="codeUrl" type="url" placeholder="https://github.com/…" />
        </label>
      </div>
      <Feedback error={error} />
      <div className="form-actions">
        <p>Published as {user.name} in this demo.</p>
        <button className="button primary" disabled={busy}>
          {busy ? "Publishing…" : "Publish project"}
        </button>
      </div>
    </form>
  );
}
