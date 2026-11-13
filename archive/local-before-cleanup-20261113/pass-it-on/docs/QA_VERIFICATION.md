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

The automated browser acceptance suite is pending the reviewer's final result at the time of this entry; use its recorded output for the final test status rather than treating this document as an automated pass report.

Real Neon PostgreSQL connectivity and AWS deployment have not been verified. Current browser verification used the explicitly configured persistent local PGlite SQL mode. Demo role switching is not real authentication.

Screenshots reviewed:

- `C:/Users/23678/.codex/visualizations/2026/10/24/01a16be4-63dc-7443-97d7-9bc25ecddad2/pass-it-on-qa/desktop.png`
- `C:/Users/23678/.codex/visualizations/2026/10/24/01a16be4-63dc-7443-97d7-9bc25ecddad2/pass-it-on-qa/mobile.png`
