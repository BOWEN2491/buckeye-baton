"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useRef, useState, type FormEvent } from "react";
import type { PickupType, RelayProjectDetail } from "@/shared/relay-types";
import { pickupTypes } from "@/shared/relay-types";
import { api, errorText, readable, useResource } from "@/lib/client";
import { useIdentity } from "@/components/app-shell";
import { Feedback, Loading, PageHeading, Status } from "@/components/ui";
import { flashKey, pickupDescriptions, SourceReference } from "@/components/relay-links";

export default function PickUpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, userId, users } = useIdentity();
  const { data, error, loading } = useResource<RelayProjectDetail>(`/projects/${id}`);
  const [pickupType, setPickupType] = useState<PickupType | "">("");
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  // One key per opened form, reused for retries so a lost response never creates two projects.
  const requestId = useRef("");
  if (loading && !data) return <Loading />;
  if (!data) return <Feedback error={error} />;
  const source = data.project;
  const owner = users.find((u) => u.id === source.ownerId);
  const back = `/projects/${source.id}`;
  const blocked =
    user?.role !== "student"
      ? "Only students can pick up a project. Switch to a student demo identity to continue."
      : source.status === "ongoing"
        ? "Ongoing projects can’t be picked up. Ask the team a question on their project instead."
        : "";

  function cancel() {
    if ((pickupType || title || goal) && !window.confirm("Discard what you entered?")) return;
    router.push(back);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next: Record<string, string> = {};
    if (!pickupType) next.pickupType = "Choose how you’re picking it up.";
    if (!title.trim()) next.title = "Enter a project name.";
    if (!goal.trim()) next.goal = "Describe your team’s goal.";
    setErrors(next);
    setFailure("");
    if (Object.keys(next).length) {
      document.getElementById(`pickup-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    requestId.current ||= crypto.randomUUID();
    setBusy(true);
    try {
      const created = await api<RelayProjectDetail>(`/projects/${source.id}/pickups`, userId, {
        requestId: requestId.current,
        pickupType,
        title,
        goal,
      });
      try {
        sessionStorage.setItem(flashKey, `Project created. You picked up ${source.title} (${readable(pickupType)}).`);
      } catch {}
      router.push(`/projects/${created.project.id}`);
    } catch (err) {
      setFailure(`We couldn’t create your project. ${errorText(err)} Everything you entered is still here.`);
      setBusy(false);
    }
  }
  return (
    <div className="pickup-page">
      <Link href={back} className="breadcrumb">
        ← Back to {source.title}
      </Link>
      <PageHeading
        title="Pick up a project"
        description="You’ll start your own Ongoing project linked to this one. The original project is not changed."
      />
      <p className="relay-source-line">
        From <strong>{source.title}</strong> <Status status={source.status} /> by {owner?.name || "Student team"}
      </p>
      {blocked ? (
        <div className="pickup-blocked">
          <Feedback error={blocked} />
          <Link href={back} className="button secondary">
            Back to project
          </Link>
        </div>
      ) : (
        <div className="pickup-grid">
          <form className="panel form-stack" onSubmit={submit} aria-label="Pick up project" noValidate>
            <Feedback error={failure} />
            <fieldset className="pickup-types" disabled={busy} aria-describedby={errors.pickupType ? "pickup-type-error" : undefined}>
              <legend>How are you picking it up?</legend>
              {pickupTypes.map((type, index) => (
                <label key={type} className={pickupType === type ? "pickup-type selected" : "pickup-type"}>
                  <input
                    type="radio"
                    name="pickupType"
                    value={type}
                    id={index === 0 ? "pickup-pickupType" : undefined}
                    checked={pickupType === type}
                    onChange={() => setPickupType(type)}
                  />
                  <span>
                    <strong>{readable(type)}</strong>
                    <span className="field-help">{pickupDescriptions[type]}</span>
                  </span>
                </label>
              ))}
              {errors.pickupType && (
                <p className="field-error" id="pickup-type-error">
                  {errors.pickupType}
                </p>
              )}
            </fieldset>
            <label>
              New project name
              <input
                id="pickup-title"
                value={title}
                maxLength={160}
                readOnly={busy}
                aria-invalid={!!errors.title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Name your team’s project"
              />
              <span className="field-help">{title.trim().length}/160</span>
              {errors.title && <span className="field-error">{errors.title}</span>}
            </label>
            <label>
              Your team’s goal
              <textarea
                id="pickup-goal"
                rows={5}
                value={goal}
                maxLength={10000}
                readOnly={busy}
                aria-invalid={!!errors.goal}
                onChange={(e) => setGoal(e.target.value)}
              />
              <span className="field-help">
                Be specific: what will exist or be answered when you’re done? It also starts your project summary, which you can edit later.
              </span>
              {errors.goal && <span className="field-error">{errors.goal}</span>}
            </label>
            <p className="pickup-note">
              Your project will link back to {source.title}, and {source.title} will list your project under “Picked up by”. Its content and owner stay the same.
            </p>
            <div className="form-actions">
              <button type="button" className="button secondary" onClick={cancel} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="button primary" disabled={busy}>
                {busy ? "Creating project…" : "Create project"}
              </button>
            </div>
          </form>
          <SourceReference project={source} />
        </div>
      )}
    </div>
  );
}
