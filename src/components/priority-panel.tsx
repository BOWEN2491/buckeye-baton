"use client";
import { useId, useState } from "react";
import { PriorityReasons, PriorityRules, UpdatedRefresh, useProjectPriority } from "./priority";

// Same server reasons as the Explore card, plus owner-only advice. Advice never sends anything.
export function PriorityPanel({ projectId, isOwner, onEdit }: { projectId: string; isOwner: boolean; onEdit: () => void }) {
  const { data, error, loading, reload } = useProjectPriority(projectId);
  const [showDetail, setShowDetail] = useState(false);
  const detailId = useId();
  return (
    <section className="panel contextual-panel priority-panel" aria-label="Project priority">
      <p className="eyebrow">Recommended because</p>
      {error && !data ? (
        <p className="workload-unavailable" role="status">
          Priority unavailable.{" "}
          <button type="button" className="text-button" onClick={() => void reload()} disabled={loading}>
            {loading ? "Retrying…" : "Retry"}
          </button>
        </p>
      ) : !data ? (
        <p className="field-help" role="status">
          Loading priority…
        </p>
      ) : (
        <>
          <PriorityReasons reasons={data.priority.reasons} projectId={projectId} />
          {error && <p className="workload-unavailable">Couldn’t refresh. Showing the last result.</p>}
          <UpdatedRefresh asOf={data.priority.asOf} loading={loading} onRefresh={() => void reload()} />
          <PriorityRules />
          {isOwner && (
            <div className="owner-advice" aria-label="Suggestions for your project">
              <div className="suggestions-heading">
                <h3>Suggestions for your project</h3>
                <button type="button" className="text-button" aria-expanded={showDetail} aria-controls={detailId} onClick={() => setShowDetail((open) => !open)}>
                  Detail
                </button>
              </div>
              <p id={detailId} className="field-help" hidden={!showDetail}>System suggestions based on your project and its discussions. Use the links below to update the project or add context to a question.</p>
              {data.advice.length ? (
                <ul>
                  {data.advice.map((a) => (
                    <li key={`${a.code}-${a.questionId}`}>
                      <p>{a.message}</p>
                      {a.code === "improve_handoff" ? (
                        <button type="button" className="text-button" aria-label="Edit project from owner advice" onClick={onEdit}>
                          Edit project
                        </button>
                      ) : (
                        <a className="text-link" href={`#q-${a.questionId}`}>
                          Go to the question
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="field-help">No suggestions right now.</p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
