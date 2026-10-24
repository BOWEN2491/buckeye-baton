# Buckeye Baton — MVP specification

Historical v1 snapshot. Superseded as product requirements by ../MVP_SPEC.md on 2026-10-24. Retained to explain the currently running application.

The project ends. The lessons keep helping the next team.

## Goal and ownership
Connect OSU student teams across semesters through reusable project lessons and contextual industry mentor advice. A project contains lessons; project status and lesson type are separate concepts. All demonstration content is fictional.

The frontend owner implements pages and interactions. The backend owner implements persistence, endpoints, validation, and role checks. Shared types, dependencies, and API changes must be coordinated through this contract and `src/shared/types.ts` before either side diverges. The coordinating chat verifies actual code and behavior.

## Roles
- Student: publish and edit owned projects and lessons, ask questions, join lessons to owned projects, record results.
- Mentor: contribute discussion and answer questions referred to them.
- OSU Staff: connect a specific student question with an industry mentor and provide a reason.

All four demo identities can discuss lessons. Demo identities are freely selectable and are explicitly not real authentication.

## Required experience
Browse projects, search lessons, read a project and its lessons, publish a project and lesson, ask a question, refer that question, reply as the chosen mentor, adopt the lesson into another owned project, and report the result. The result appears at the source lesson and the adopting project. Refreshes retain all saved data.

## Content and state
- Project states: `ongoing`, `finished`, `paused`. Display a consistent page structure, emphasizing current needs, outcomes, or reusable unfinished work respectively. Changing state preserves lessons, discussions, referrals, and adoptions.
- Lesson types: `worked`, `pitfall`, `next_team`. Each lesson includes what was assumed, what happened, the change or proposed next step, applicability conditions, and optional artifact links.
- An adoption initially has `result: null` and an empty note. It represents intention only. Reporting `worked`, `partial`, or `failed` requires a meaningful note and may include an evidence link. Only reported results count as usage. Updating an existing record does not increase the count.
- No automatic Verified label. Display concrete reported outcomes. No claim that feedback proves general validity.

## Page responsibilities
1. Explore: project cards with title, summary, owner, affiliation, term, tags, state; keyword and state filtering; lesson search.
2. Project: overview, external links, lessons, incoming use of its lessons, lessons adopted by this project, project publication/editing.
3. Lesson: provenance, experience and conditions, discussion, referral history, adoption and results.
4. Connections: Staff referral creation and Mentor pending questions, leading to the original discussion.
5. Demo identity switcher: Alex, Mia, Sarah, Kevin; visible demo disclaimer. Switching identities returns to Explore projects with search and filters reset. Unsaved page forms reset; persisted records remain.

Projects describe a team's whole effort; lessons capture individual reusable discoveries within that effort. The lesson action explicitly offers saving to an owned project, followed by reporting an outcome after trying it. Saving alone is not evidence of use.

## Deferred
Real OSU login, files, full forks, complex network visualizations, a notification center, AI summaries, and AI mentor matching. Future matching may classify questions by tags and shortlist mentors, with Staff making the final selection.

## Collaboration sequence
Freeze contracts and seed content; develop frontend with shared fixtures while backend implements endpoints; integrate question → referral → reply first, then publication/search/adoption. Final acceptance follows `ACCEPTANCE.md`. Deploy only after account eligibility is known; no remote repository or cloud resource is assumed to exist.
