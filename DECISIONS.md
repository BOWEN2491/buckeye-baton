# Decisions

### Keep source and dependencies on D: with explicit project Python
**Date:** 2026-10-22 · **Status:** Accepted
**Files:** `.venv/`, `start.ps1`, `.vscode/settings.json`

In the context of a Windows hackathon workstation with Miniconda on C:,
facing limited C: space and multiple Python installations,
we decided for a D: project-local venv based on the already working Python 3.11,
to achieve predictable launches and isolated dependencies,
accepting that Conda-specific native libraries would require a separate later environment.

### Rehearse connectivity without competition features or API spending
**Date:** 2026-10-22 · **Status:** Accepted
**Files:** `backend/main.py`, `frontend/`, `fallback/app.py`, `scripts/check_api.py`, `PRIOR_WORK.md`

In the context of preparation before the challenge is selected,
facing a need to verify full-stack development without inventing the entry,
we decided for a deterministic echo rehearsal with a Vite development proxy and a separate opt-in API check,
to achieve a testable local workflow and clear prior-work disclosure,
accepting that public hosting and actual product logic remain future work.
