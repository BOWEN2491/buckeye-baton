# Current browse introduction pipeline

Reviewed 2026-10-25. This explains existing P5 behavior; no model, prompt or generation state behavior was changed for the UI refinement.

1. Creating a project with a repository, or editing saved source fields, enqueues durable project AI work in the same transaction. Source identity includes title, summary, course/club, term, repository URL, status and the entire reflection. Changing any of these invalidates the old publication. See `src/server/api.ts`, `recommendations.ts`, `ai-jobs.ts`.
2. With `AI_ANALYSIS_RUNNER_ENABLED=1`, a sustained Node process checks every five seconds and runs one task at a time. No runner means tasks remain pending.
3. GitHub inputs include description, default-branch commit, languages, README and up to two root manifests. Files are pinned to the commit. Anonymous GitHub calls time out after ten seconds, have response/file/combined size bounds and use a five-minute cache. Cache expiry alone does not hide publication; a newly read, changed snapshot does.
4. The Responses API receives saved project data plus repository data, with strict JSON schema for 1–3 sentences, 1–3 fixed Topics and 0–6 fixed Technologies. Model comes from local OPENAI_PROJECT_INTRO_MODEL. Each request has a thirty-second timeout.
5. Inputs longer than 16,000 characters are repeatedly reduced by shortening every string/list. This can remove useful README or dependency evidence. Output validation checks sentence constraints, allowed labels and literal technology evidence; one invalid technology rejects the whole output. There is no deterministic text template, so regenerated wording can differ.
6. Success saves a private draft. Owner edits sentences and must confirm publication. Until confirmation, Explore uses authored summary. Editing a project can immediately hide an already confirmed introduction while its replacement is queued/generated/reviewed. A new draft alone is not publication.
7. Transient failures retry at most twice, thirty and 120 seconds after failures. Configuration errors and unusable output require manual retry. Changed project/repository identity blocks stale results and old-tab confirmation. Browse only reads saved publication; it never generates text on page view.

## Read-only observations from the current 3001 preview

At inspection, SafeSight had status stale, no current draft and no public AI introduction; it was not reporting a provider failure. Club Inventory Checkout++ had ready, a current draft and a public introduction. Older projects without repositories had no P5 task. This shows different pipeline states, not evidence of an intermittent model outage. No real AI calls were made for this inspection.

## Possible follow-up changes

Discuss separately: narrower invalidation for nonsemantic metadata; explicit stale/review states in the owner panel; prioritised truncation retaining technology evidence; independent retry for invalid labels; retaining the last reviewed introduction with a stale label. The last option changes the approved P5 fallback-to-authored-summary policy.
