# Buckeye Baton — teammate handoff

Use the repository root, Node 22, and README setup commands. This replaces the earlier Python/Vite environment rehearsal.

## Shared source of truth

- docs/MVP_SPEC.md: complete approved project-centered target and current first-round boundary.
- docs/API_CONTRACT.md and src/shared/types.ts: implemented reflection shapes and retained history APIs; independent lesson pages redirect to projects and adoption writes are retired (410).
- docs/PHASE1_ACCEPTANCE.md: current project interactions and verification status.
- docs/ACCEPTANCE.md: full future relay story, not implemented by this round.

## Your current review

Try the homepage filters and the three project states against your card designs. As Alex or Mia, create a project, edit progress and team reflections, save Finished/Paused with required fields, return Ongoing and refresh. Note unclear labels, missing empty/success/error states and desktop/mobile problems. Content should be fictional and first-hand; there is no AI summary.

Pickup, project questions, Staff referral and Mentor guidance deliberately show inline coming-next messages. They do not create relationships or send requests. Please do not treat these placeholders as complete features.

## Next design handoff

After the first-round trial, supply a small pickup form (reproduce/continue/improve, new name, objective) and a project question → Staff referral → Mentor response interaction. These sketches are not prerequisites for the current homepage/card work. Avoid expanding independent Lesson/adoption flows.

## Parallel implementation

Use separate codex/ branches and working directories. Frontend owns pages/components/client helpers; backend owns API/server/database/scripts. Coordinate shared types and dependency changes. Real endpoints remain the shared source of business state; do not substitute local-only data.

## Acceptance boundary

Current: browse → owned reflection edit → validated status save → retained history and reload. Full future target: Alex's Paused project → Mia's linked Ongoing project → project question → Kevin's introduction → Sarah's guidance → Mia's updated progress. Local verification does not verify cloud hosting or real authentication.
