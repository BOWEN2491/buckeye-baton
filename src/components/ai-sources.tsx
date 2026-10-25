import type { GitHubSources } from "@/shared/p5-types";
import { formatDateTime } from "@/lib/client";

export function AISources({ sources }: { sources: GitHubSources | null }) {
  if (!sources) return null;
  return <details className="ai-sources"><summary>Sources{sources.evidence !== "github" ? ` · ${sources.evidence} evidence` : ""}</summary>
    {sources.evidence !== "github" && <p className="state-note">{sources.evidence === "simulation" ? "Simulation" : "Mock"} evidence — this is not a live GitHub analysis.</p>}
    <p><a href={sources.repoUrl} target="_blank" rel="noreferrer">GitHub repository ↗</a></p>
    <p className="field-help">Combined with the project’s saved description, status, progress and team reflections.</p>
    <p className="metadata">{sources.evidence === "simulation" ? "Evidence recorded" : "Read"} {formatDateTime(sources.readAt)} · {sources.commit ? `Commit ${sources.commit}` : sources.evidence === "simulation" ? "No repository commit read" : "No commit available (empty repository)"}</p>
    {sources.missingREADME && <p className="field-help">No README was available.</p>}
    {sources.files.length ? <ul>{sources.files.map(file => <li key={file.path}>{file.path}{file.truncated ? " · truncated" : ""}</li>)}</ul> : <p className="field-help">No source files were read.</p>}
  </details>;
}
