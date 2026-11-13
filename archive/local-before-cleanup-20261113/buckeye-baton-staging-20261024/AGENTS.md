# Pass It On — implementation guidance

Read this app's README, `docs/MVP_SPEC.md`, `docs/API_CONTRACT.md`, `docs/ACCEPTANCE.md`, and `src/shared/types.ts` before edits. Parent documentation contains historical rehearsal context; do not replace the root Vite/FastAPI application.

- Frontend owns `src/components` and non-API `src/app` pages/layout/styles. Backend owns `src/server`, API route handlers, `db`, and database scripts. Coordinate shared types, config and dependencies before changing contracts.
- Canonical fixtures in `src/shared/fixtures.ts` are fictional. Use existing IDs when exercising the documented journey.
- Use Node.js 22. Run `npm ci`, copy `.env.example` to `.env.local`, then `npm run db:setup` and `npm run dev`. Checks: `npm run typecheck`, `npm run test:backend`, `npm run build`; browser tests follow the Playwright configuration when supplied.
- Demo identity header `x-demo-user-id` is deliberately impersonatable. Keep the visible disclaimer; do not present it as real authentication. Preserve server-side role/ownership checks.
- Local `DATABASE_MODE=pglite` persists in `.data/pglite`, one application process per data directory. Hosted mode requires a real `DATABASE_URL`; do not silently fall back to in-memory data.
- Never commit `.env.local`, credentials, node_modules, `.next`, `.data`, or test artifacts. Do not claim AWS/Neon/public deployment without actual verification.
- Keep project status distinct from lesson type and adoption result. Count completed reports, not just joined lessons. Preserve discussion/referral/adoption history on state changes.
- AI summaries and AI mentor recommendation are deferred. Future matching may classify questions and shortlist mentors; Staff retains final choice.
