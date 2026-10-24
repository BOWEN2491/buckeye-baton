# Project entry point

This repository is **BOWEN2491/Hacking1024**. The owner's checkout is `D:\HackOHIO_1024`; another collaborator's checkout may be elsewhere. Verify the working directory and Git remote before changing files. The old chat workspace `C:\Users\23678\Documents\ChatGPT\O` is not this project's checkout.

## Read before working

1. `PROJECT_CONTEXT.md` — short background, verified state, uncertainties and next steps.
2. `project-docs/index.html` — authoritative project state. Read its `meta` JSON and relevant sections before searching source files.
3. `project-docs/MAINTENANCE.md` — how to maintain the document.
4. `DECISIONS.md` — accepted technical choices; consult `README.md`, `TEAMMATE.md` and `CHECKLIST.md` as needed.

These documents describe context and pending work. They do not replace the user's current request or automatically authorize every backlog item. If the user provides new facts, update the relevant status instead of repeating old assumptions.

## Current scope and conventions

- This is a pre-event environment rehearsal. No final challenge, sponsor-specific solution or competition product has been chosen.
- Plan for one core developer plus a beginner teammate; keep the MVP manageable. The teammate is expected to try frontend work, testing and presentation.
- Stack: React + Vite frontend, FastAPI backend, Streamlit fallback. Echo rehearsal does not use AI. Optional OpenAI test is separate.
- Use the project's `.venv` explicitly. Do not modify global Python, Conda base or global PATH for routine project setup.
- Do not print or commit credentials. Read environment-variable names from `.env.example`; inspect credential presence without exposing contents. Real keys stay local or in hosting secrets, never in React.
- Keep `main` runnable. Agent-created task branches normally use `codex/<task>`; teammate branches can use `teammate/<task>`. Do not force-push or discard unrelated local work.
- Preserve `PRIOR_WORK.md` and distinguish pre-event code from work done during the competition.

## Validation and handoff

- Run checks appropriate to the actual change. UI behavior changes need browser interaction checks when available; a build alone does not prove interaction works.
- Record what was actually verified and when. Historical tests and previously working credentials are not evidence of a fresh test or available budget.
- Before ending meaningful work, update the affected marker sections of `project-docs/index.html`, its `meta` fields, and the short snapshot in `PROJECT_CONTEXT.md` when state changes. Update `DECISIONS.md` for significant choices.
- Do not mark account access, event registration, deployment or teammate readiness complete without evidence.
