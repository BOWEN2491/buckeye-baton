# Decisions

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
