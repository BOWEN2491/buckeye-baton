# Current phase 1 verification

2026-10-24: project-centered phase 1 with legacy UI cleanup passed typecheck, backend 3/3, production build and browser 5/5 (10.4 seconds). The repository Playwright workflow runs a production server with isolated SQL storage. Verified behaviors: creation/edit → Finished/Paused validation → Ongoing with saved reflections preserved; filters, identity reset, non-mutating placeholders and 390px state details.

## Legacy UI cleanup

Independent Lesson pages now redirect to their source project; missing lessons return 404. Historical experience remains readable inline. No product page offers independent Lesson publishing/discussion, adoption forms, outcome counts or links into `/lessons/`.

Adoption response fields and active business logic are removed. Retired adoption POST/PATCH endpoints return 410 before database writes; stored records remain untouched. Project questions, Staff referral and Mentor guidance are still next-round placeholders.

A fifth browser regression covers old lesson URLs and absence of adoption UI/lesson links on home, project details and workspaces. Fresh cleanup validation passed: typecheck, backend integration 3/3, production build and all five browser tests. Live production port 3000 was restarted and separately checked with Playwright: /lessons/lesson-fields#discussion redirected to /projects/project-signup#discussion, old UI matches were zero, and page errors were zero. The documentation screenshot tool recaptured eight live images. An independent review found no regressions, stale imports, old UI links or shared-CSS issues. Missing-lesson 404 is implemented but was not separately exercised in this browser run. Earlier Lesson-v1 evidence is archived in legacy/QA_LESSON_V1.md and does not describe current features.

## Evidence boundary

Screenshots are captured using QA_SCREENSHOT_DIR and project-docs/take-screenshots.mjs. Node 22 and local PGlite checks do not verify complete v2 relay, hosted PostgreSQL, AWS or public deployment.
