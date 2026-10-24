import Link from "next/link";
import type { Project } from "@/shared/types";
import type { PickupType, RelayLink } from "@/shared/relay-types";
import { formatDate, readable } from "@/lib/client";
import { Status } from "./ui";

export const pickupDescriptions: Record<PickupType, string> = {
  reproduce: "Rebuild what they made, to learn how it works or to check it still works.",
  continue: "Keep going on the parts they didn’t finish.",
  improve: "Make one feature or method better.",
};
// Success notice handed from the pickup form to the new project page.
export const flashKey = "buckeye-baton-flash";

export function SourceLine({ source }: { source: RelayLink }) {
  return (
    <section className="relay-source" aria-label="Project source">
      <p className="relay-source-line">
        Picked up from{" "}
        <Link className="text-link" href={`/projects/${source.project.id}`}>
          {source.project.title}
        </Link>{" "}
        <Status status={source.project.status} /> by {source.owner.name} · {readable(source.pickupType)}
      </p>
      <p className="metadata">
        Goal when picked up on {formatDate(source.pickedUpAt)}: {source.goal}
      </p>
    </section>
  );
}

export function Successors({ successors }: { successors: RelayLink[] }) {
  return (
    <section className="section-block" aria-label="Picked up by">
      <h2>Picked up by ({successors.length})</h2>
      {successors.length ? (
        <ul className="successor-list">
          {successors.map((s) => (
            <li key={s.project.id}>
              <div className="successor-top">
                <Link className="successor-title" href={`/projects/${s.project.id}`}>
                  {s.project.title}
                </Link>
                <Status status={s.project.status} />
              </div>
              <p className="metadata">
                {s.owner.name} · {readable(s.pickupType)} · started {formatDate(s.pickedUpAt)}
              </p>
              <p className="successor-goal">Goal: {s.goal}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="subtle-empty">No one has picked up this project yet.</p>
      )}
    </section>
  );
}

function List({ title, values }: { title: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <>
      <h3>{title}</h3>
      <ul className="reflection-list">
        {values.map((v, i) => (
          <li key={i}>{v}</li>
        ))}
      </ul>
    </>
  );
}

// Read-only view of the source while filling in the pickup form.
export function SourceReference({ project }: { project: Project }) {
  const r = project.reflection;
  return (
    <details className="panel source-reference" open>
      <summary>Reference: {project.title}</summary>
      <p className="field-help">Read-only. Nothing here is copied into your project.</p>
      <h3>About the project</h3>
      <p className="reflection-prose">{project.summary}</p>
      {project.status === "paused" && r && (
        <>
          {r.whyPaused && (
            <>
              <h3>Why they paused</h3>
              <p className="reflection-prose">{r.whyPaused}</p>
            </>
          )}
          <List title="If they did it again" values={r.ifAgain} />
          <List title="What you can reuse" values={r.reusable.map((v) => v.label)} />
        </>
      )}
      {project.status === "finished" && r && (
        <>
          <List title="What they got" values={r.outcomes} />
          <List title="Problems they encountered" values={r.problems.map((p) => p.title)} />
          {r.nextTeam && (
            <>
              <h3>For the next team</h3>
              <p className="reflection-prose">{r.nextTeam}</p>
            </>
          )}
        </>
      )}
      {!r && <p className="subtle-empty">This project keeps its earlier experience on the project page.</p>}
    </details>
  );
}
