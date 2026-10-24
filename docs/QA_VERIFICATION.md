# UI verification and visual reference ledger

Reviewed on October 24, 2026. The generated `explore-concept.png` is the visual reference, not an application asset or a pixel-perfect acceptance claim. The implementation is a functional GitHub-style knowledge relay using the approved data contract.

## Visual review

The frontend agent inspected the concept and the production-server desktop and 390px mobile screenshots with `view_image`.

| Area | Observed result |
| --- | --- |
| Layout and palette | White content canvas, slate text, restrained scarlet actions, and a pale fixed desktop sidebar preserve the reference direction. The right-hand relay guide remains secondary to actual projects. |
| Hierarchy | Page heading, supporting sentence, search, Projects/Lessons tabs, status filters, and project cards retain the reference order. There is no marketing hero displacing the application. |
| Typography | Shared sans-serif tokens distinguish headings, project titles, body copy, metadata, and controls. The implementation uses Arial/Helvetica fallbacks rather than attempting to reproduce every generated glyph or weight. |
| Responsive layout | At 390px the sidebar becomes a top navigation area, project cards stack, the primary action wraps below the heading, and the secondary guide is hidden. The inspected screenshot has readable content without visible horizontal clipping; the demo identity notice remains visible. |
| Controls and provenance | Search, tabs, status controls, role selection, and publishing links are code-native controls. Project/lesson detail flows preserve source-project links, introductions, reported outcomes, and destination-project links. Demo identity and local SQL storage are explicitly labeled. |

## Intentional differences from the concept

- Only the two approved fictional fixture projects are initially displayed. The four invented projects and invented lesson/usage counts in the concept were not implemented as fabricated product evidence.
- There is no invented sorting control or starter-project filter. Every visible exploration control maps to implemented behavior.
- Product names, participant names, content, and counts come from the shared fixtures/API contract. Some copy was adjusted from the concept to describe the actual relay workflow.
- Icon details, exact font metrics, card density, and available whitespace differ from the image. The reference establishes the visual direction; this ledger does not assert pixel-perfect equivalence or a 10/10 fidelity score.

## Functional verification status

Root manually completed the core journey in the in-app browser against the production server: student question → Staff introduction → assigned Mentor response → save a lesson → report an outcome → verify source and destination project records. Desktop and mobile screenshots were captured during this review.

The final Node 22 automated browser acceptance run passed both tests: full publishing/referral/adoption journey, and exploration/search/empty states/mobile layout. It used an isolated local SQL database and a production server.

Real Neon PostgreSQL connectivity and AWS deployment have not been verified. Current browser verification used the explicitly configured persistent local PGlite SQL mode. Demo role switching is not real authentication.

Screenshots reviewed:

- `C:/Users/23678/.codex/visualizations/2026/10/24/01a16be4-63dc-7443-97d7-9bc25ecddad2/buckeye-baton-qa/desktop.png`
- `C:/Users/23678/.codex/visualizations/2026/10/24/01a16be4-63dc-7443-97d7-9bc25ecddad2/buckeye-baton-qa/mobile.png`

## Rename and regression follow-up
The product is now Buckeye Baton; the concept retains its earlier working title as a historical reference. A real Projects/Lessons cross-type rendering race was fixed by keying resource state by path and identity. The fresh production build and 2/2 browser tests passed after root cleanup and rename.

## First usability feedback
Identity switching now replaces the route with `/` and remounts page state, restoring the Projects tab and clearing searches, filters and unsaved forms. Persisted records remain intact. Project pages explain their contained lessons; lesson breadcrumbs explicitly identify the source project. The adoption panel now says “Use this lesson in your project” for students and explains saving first, then reporting after trying. Mentor/Staff see an informational heading instead.

Verified on Node 22 against a production build: typecheck, backend integration and all 3 Playwright tests passed. The added regression covers identity switches from a filtered Lessons tab, project detail, lesson detail and workspace, followed by reload and persisted identity. The complete publishing/referral/adoption journey also passed with reopening the lesson after each switch. Desktop 1400×900 and mobile 390×844 layouts were checked. Browser plugin not available; the repository's Playwright workflow was used. No relevant browser console errors or page exceptions were observed. This does not verify cloud hosting or other browsers.
