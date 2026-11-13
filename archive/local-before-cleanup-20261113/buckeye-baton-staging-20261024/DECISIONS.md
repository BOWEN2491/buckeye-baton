# Decisions

### Dedicated writable workspace
**Date:** 2026-10-24 · **Status:** Accepted

In the context of an empty repository under Documents, facing reproducible write failures from both patch and filesystem APIs, we decided for a dedicated repository at `C:\Users\23678\.codex\workspaces\pass-it-on`, to achieve reliable implementation, accepting that the original empty repository is not the implementation checkout. The original directory was not deleted or moved.

### One Next.js application and shared contracts
**Date:** 2026-10-24 · **Status:** Accepted

In the context of a solo developer and parallel frontend/backend work, facing deployment and integration overhead, we decided for Next.js 15.5.28, Node.js 22, React 19, TypeScript, Tailwind CSS, and a common camelCase API/type contract, to achieve a coherent handoff, accepting that demo identity is not a production login system. The latest Next 15 patch was checked against the npm registry on this date.

### PostgreSQL with an explicit local demo database
**Date:** 2026-10-24 · **Status:** Accepted

In the context of no supplied Neon credentials and no installed native PostgreSQL, facing the need to validate real persistence locally, we decided for `pg` in hosted mode and explicit persisted PGlite in local mode, to achieve runnable integration tests and restart persistence, accepting that local mode is single-process and does not validate remote connectivity. Missing hosted credentials must never silently select in-memory storage.

### Concrete adoption results and human introductions
**Date:** 2026-10-24 · **Status:** Accepted

In the context of knowledge transferring across student teams, facing ambiguity in verified claims, we decided for one adoption record per source lesson and receiving project, counting only submitted results, to achieve traceable contributions, accepting self-reported evidence. Staff retains final mentor selection; AI tagging and shortlist recommendations are deferred.
