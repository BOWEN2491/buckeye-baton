# Decisions

### Specify P2 owner-reviewed browsing content and shared Mentor workload semantics
**Date:** 2026-10-24 · **Status:** Implemented on P2 branch and independently accepted locally; main merge pending
**Files:** docs/P2_AGENT_TASK.md, docs/P2_CONTRACT.md, docs/EXECUTION_ROADMAP.md

In the context of the user requesting the same single-agent handoff as P1, facing AI text overwriting authored experience and workload counts drifting from existing follow-up rules, we decided for separate draft/published introductions with source hashes and owner confirmation, plus Staff-only question counts reusing P1 thread state, to achieve reviewable AI browsing content and consistent manual referrals, accepting additional metadata and a required live AI verification gate. Provider/key decisions precede API implementation; no credentials or calls are authorized by writing the task. P2 remains 0/10 until independent acceptance.

### P1 single-agent delivery supersedes the two-worker split
**Date:** 2026-10-24 · **Status:** Accepted by user
**Supersedes:** P1 backend/frontend split in “Coordinate two external workers with a contract-first P1”.

In the context of the user choosing one Agent for P1 and requesting minimal report forwarding, facing unnecessary type handoffs and branch coordination, we decided for one full-stack task branch and one final READY report, to achieve continuous implementation with independent coordinator acceptance, accepting that a single worker owns both API and UI. P1 contract and ten gates stay unchanged; only genuine blockers add reports. No application implementation is claimed by this documentation change.

### Coordinate two external workers with a contract-first P1
**Date:** 2026-10-24 · **Status:** Accepted execution coordination
**Files:** docs/EXECUTION_ROADMAP.md, docs/P1_CONTRACT.md, docs/workers/

In the context of the user preparing two external agents and asking this chat to coordinate implementation and progress, facing contract divergence and unverified percentage reports, we decided for backend/frontend ownership on short-lived task branches, a first shared-types handoff and ten independently verified P1 gates, to achieve parallel implementation with measurable integration progress, accepting a small initial synchronization step and user-relayed status from external workers. Product labels remain English; the user clarified question-level reply deadlines and automatic rate-limited in-app invitations for later phases. No new feature is claimed complete by these coordination documents.

### Consolidate repository around main and one active checkout
**Date:** 2026-10-24 · **Status:** Accepted; merge explicitly authorized by user
**Files:** docs/PROJECT_OVERVIEW.md, docs/HANDOFF.md, design/README.md

In the context of the user requesting a project and branch cleanup and authorizing PR #1 to merge into main, facing stale preparation branches, repeated working directories and contradictory design notes, we decided for main as the shared baseline, one active checkout and short-lived task branches, to achieve an unambiguous handoff, accepting that future parallel work needs task-specific branches again. Both preparation branches were clean ancestors of the active MVP with no unique commits or ignored files; their checkouts and local/remote refs were removed. Design originals are copied as references with unresolved rules flagged; old planning notes remain archived.

### Project-centered relay specification supersedes independent Lesson adoption
**Date:** 2026-10-24 · **Status:** Accepted for specification; implementation pending
**Files:** docs/MVP_SPEC.md, docs/ACCEPTANCE.md, docs/API_CONTRACT.md, PROJECT_CONTEXT.md
**Supersedes:** Lesson-centered requirements in docs/legacy/MVP_SPEC_LESSON_V1.md (historical snapshot).

In the context of the user approving the teammate's three project-state designs and five scope decisions, facing unclear independent Lesson adoption and excessive MVP complexity, we decided for embedded project reflections, project questions with Staff/Mentor referrals, and linked successor projects for reproduce/continue/improve, to achieve one understandable handoff journey, accepting a future contract/data migration and removal of per-lesson outcome tracking from the target UI. This documents the approved direction on codex/buckeye-baton-mvp; code and records remain v1 until coordinated implementation preserves historical data.

### Keep source and dependencies on D: with explicit project Python
**Date:** 2026-10-22 Â· **Status:** Accepted
**Files:** `.venv/`, `start.ps1`, `.vscode/settings.json`

In the context of a Windows hackathon workstation with Miniconda on C:,
facing limited C: space and multiple Python installations,
we decided for a D: project-local venv based on the already working Python 3.11,
to achieve predictable launches and isolated dependencies,
accepting that Conda-specific native libraries would require a separate later environment.

### Rehearse connectivity without competition features or API spending
**Date:** 2026-10-22 Â· **Status:** Accepted
**Files:** `backend/main.py`, `frontend/`, `fallback/app.py`, `scripts/check_api.py`, `PRIOR_WORK.md`

In the context of preparation before the challenge is selected,
facing a need to verify full-stack development without inventing the entry,
we decided for a deterministic echo rehearsal with a Vite development proxy and a separate opt-in API check,
to achieve a testable local workflow and clear prior-work disclosure,
accepting that public hosting and actual product logic remain future work.

### Keep project context in the repository for future conversations
**Date:** 2026-10-23 Â· **Status:** Accepted
**Files:** `AGENTS.md`, `PROJECT_CONTEXT.md`, `project-docs/`, `CLAUDE.md`

In the context of reopening coding-agent conversations and collaborating with a beginner teammate,
facing context loss and historical checklist assumptions,
we decided for a short Markdown snapshot plus a maintained HTML project page linked from agent entry files,
to achieve a discoverable handoff with explicit verification dates and unknowns,
accepting that state changes require updating both the snapshot and the relevant HTML markers.


### Preserve rehearsal and add the competition app in a separate directory
**Date:** 2026-10-24 Â· **Status:** Accepted
**Files:** `pass-it-on/`, `PROJECT_CONTEXT.md`, `project-docs/index.html`

In the context of the user confirming Honda challenge and the buckeye-baton repository, facing a need to preserve pre-event work and concurrent teammate changes, we decided for an independent codex branch and a new pass-it-on/ application directory, to achieve reviewable integration without replacing rehearsal files, accepting two application entrypoints that documentation must distinguish. The current MVP uses Next.js 15 and Node.js 22 with hosted pg or explicitly selected local persistent PGlite; demo identity is not authentication. This adds a competition implementation without invalidating historical rehearsal decisions.

### Buckeye Baton root application cleanup
**Date:** 2026-10-24 · **Status:** Accepted

In the context of the user renaming the product and explicitly requesting removal of obsolete rehearsal code, facing duplicate entrypoints and unrelated dependencies, we decided for the Next.js competition application at repository root and removal of the superseded tracked examples, to achieve one clear runnable project, accepting that historical rehearsal files must be recovered from Git. The app uses pg for hosted PostgreSQL and explicit persistent PGlite for local development; demo identity is not authentication.

### Deliver project reflections first and preserve legacy records additively
**Date:** 2026-10-24 · **Status:** Accepted
**Files:** db/schema.sql, src/shared/types.ts, docs/PHASE1_ACCEPTANCE.md

In the context of the user authorizing homepage/card interactions before pickup and discussion sketches, facing the risk of deleting existing Lesson histories or claiming an unfinished relay, we decided for nullable project reflection JSONB via a repeatable additive migration, inline historical lessons for null reflections, and non-mutating inline placeholders for future actions, to achieve a usable first project-centered slice while preserving records, accepting historical data retention; the adoption endpoint/UI exception is superseded by the cleanup decision below. This stages the approved project-centered specification rather than superseding its complete relay target.

### Retire independent Lesson and adoption UI while preserving history
**Date:** 2026-10-24 · **Status:** Accepted
**Files:** src/app/lessons/[id]/page.tsx, src/server/api.ts, tests/e2e/journey.spec.ts
**Supersedes:** The adoption compatibility portion of “Deliver project reflections first and preserve legacy records additively”.

In the context of the user explicitly asking to delete the remaining old adoption implementation, facing old links that still exposed a superseded workflow, we decided for source-project redirects, removal of unused lesson/adoption components and adoption response fields, and HTTP 410 for retired adoption writes, to achieve one project-centered interface, accepting a deliberate compatibility break for obsolete adoption clients while preserving all stored history and inline historical experience.
