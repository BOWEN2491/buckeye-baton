# Buckeye Baton — teammate handoff

Use the repository root, Node 22, and the README setup commands. This replaces the earlier Python/Vite environment rehearsal.

## Shared source of truth
- docs/MVP_SPEC.md: approved roles, states and scope.
- docs/API_CONTRACT.md and src/shared/types.ts: request/response shapes.
- docs/ACCEPTANCE.md: four-identity demo and negative cases.

## Design and content
Deliver project, lesson and referral workspace layouts, field labels, empty/error/success states and a three-minute story. Student content stays first-hand; no AI summary in v1.

## Parallel implementation
Use separate codex/ branches and working directories. Frontend: pages/components/client helpers. Backend: API/server/database/scripts. Coordinate shared types and dependencies before changing them. Connect real endpoints, avoiding a second client-only rules system.

## Acceptance
Mia finds a lesson and asks; Kevin refers Sarah; Sarah responds; Mia reports usage in her project; Alex sees the downstream result. Counts only include reported outcomes, not saved lessons. Check desktop/mobile and keep sample stories clearly fictional.
