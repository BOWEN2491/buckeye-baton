"use client";
import { useState, type FormEvent } from "react";
import type { LessonInput } from "@/shared/types";
import { api } from "@/lib/client";
import { useIdentity } from "./app-shell";
import { Feedback } from "./ui";
export function LessonForm({
  projectId,
  onSaved,
}: {
  projectId: string;
  onSaved: () => void;
}) {
  const { userId } = useIdentity();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const url = String(f.get("url"));
    const input: LessonInput = {
      title: String(f.get("title")),
      type: String(f.get("type")) as LessonInput["type"],
      assumed: String(f.get("assumed")),
      happened: String(f.get("happened")),
      change: String(f.get("change")),
      conditions: String(f.get("conditions")),
      artifacts: url ? [{ label: "Related artifact", url }] : [],
    };
    setBusy(true);
    setError("");
    try {
      await api(`/projects/${projectId}/lessons`, userId, input);
      form.reset();
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-stack panel" onSubmit={submit}>
      <h3>Pass on a lesson</h3>
      <div className="form-row">
        <label>
          Lesson title
          <input
            name="title"
            required
            placeholder="What should the next team know?"
          />
        </label>
        <label>
          Type
          <select name="type">
            <option value="worked">What worked</option>
            <option value="pitfall">Pitfall</option>
            <option value="next_team">For the next team</option>
          </select>
        </label>
      </div>
      <label>
        What did you expect?
        <textarea name="assumed" required rows={2} />
      </label>
      <label>
        What actually happened?
        <textarea name="happened" required rows={3} />
      </label>
      <label>
        What changed, or what would you do next?
        <textarea name="change" required rows={3} />
      </label>
      <label>
        When does this apply?
        <textarea
          name="conditions"
          required
          rows={2}
          placeholder="Context, limitations, and things the next team should check."
        />
      </label>
      <label>
        Evidence or artifact link <span className="optional">optional</span>
        <input name="url" type="url" placeholder="https://" />
      </label>
      <Feedback error={error} />
      <button className="button primary" disabled={busy}>
        {busy ? "Publishing…" : "Publish lesson"}
      </button>
    </form>
  );
}
