"use client";
import { useEffect, useState, type FormEvent } from "react";
import { EXPERTISE, type Expertise, type ExpertiseProfile } from "@/shared/p5-types";
import { api, errorText, useResource } from "@/lib/client";
import { useIdentity } from "@/components/app-shell";
import { Feedback, Loading, PageHeading } from "@/components/ui";
import { invalidateMentorWorkload } from "@/components/mentor-workload";

function ExpertiseForm() {
  const { userId } = useIdentity();
  const { data, error, loading, reload } = useResource<ExpertiseProfile>("/mentors/me/expertise", userId);
  const [expertise, setExpertise] = useState<Expertise[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => { if (data && !loaded) { setExpertise(data.expertise); setLoaded(true); } }, [data, loaded]);
  async function save(e: FormEvent) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setFailure(""); setSuccess("");
    try { await api<ExpertiseProfile>("/mentors/me/expertise", userId, { expertise }, "PATCH"); window.dispatchEvent(new Event("buckeye-baton:expertise-updated")); invalidateMentorWorkload(); setSuccess("Expertise saved. Staff recommendations will use your current selection."); }
    catch (err) { setFailure(`Couldn’t save. ${errorText(err)} Your selection is kept.`); }
    finally { setBusy(false); }
  }
  if (loading && !data) return <Loading />;
  return <form className="panel form-stack" onSubmit={save} aria-label="Mentor expertise"><Feedback error={error || failure} success={success} />
    {!data ? <button type="button" className="button secondary" onClick={() => void reload()}>Retry</button> : <>
      <fieldset className="choice-group" disabled={busy}><legend>Your expertise</legend>{EXPERTISE.map(domain => <label className="choice" key={domain}><input type="checkbox" checked={expertise.includes(domain)} onChange={event => setExpertise(current => event.target.checked ? [...current, domain] : current.filter(value => value !== domain))} />{domain}</label>)}</fieldset>
      <p className="field-help">Choose the areas you can help with. Leaving all unchecked shows “Expertise not set” and excludes you from AI suggestions; Staff can still refer you manually.</p>
      <button type="submit" className="button primary" disabled={busy}>{busy ? "Saving…" : "Save expertise"}</button>
    </>}
  </form>;
}
export default function ProfilePage() {
  const { user } = useIdentity();
  if (!user) return <Loading />;
  return <><PageHeading title="My expertise" description="Help Staff understand which questions fit your experience." />{user.role === "mentor" ? <ExpertiseForm key={user.id} /> : <Feedback error="Only mentors can edit expertise. Switch to a mentor demo identity." />}</>;
}
