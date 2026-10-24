# project-docs Maintenance Rules

## Always read first
At the start of every plan or task in this repository, READ `project-docs/index.html` BEFORE searching the code.

- The `<script id="meta">` JSON block (top of file) gives quick orientation: current focus, last completed, next up.
- The **Architecture → File Map** tells you which file does what. Don't grep — check the map first.
- The **Decisions Log** explains why previous choices were made. Don't undo decisions without reading these.

## Update discipline

After completing meaningful work, update the relevant section(s) of `index.html` via surgical edits between the `<!-- claude:NAME:start --> ... <!-- claude:NAME:end -->` markers.

| What changed | Section(s) to update |
|---|---|
| New feature, status change | `claude:features` + `claude:changelog` |
| Design token (color, font) | `claude:design:colors` or `claude:design:typography` + `claude:changelog` |
| UI visibly changed | Re-run `take-screenshots.mjs`, update `claude:design:screenshots` |
| New major file / renamed module | `claude:architecture:filemap` |
| New external service | `claude:architecture:integrations` |
| New env var | `claude:architecture:env` |
| Architecturally significant choice | `claude:architecture:decisions` |
| Wishlist item added/completed | `claude:wishlist` (and `claude:features` if shipped) |

**Session lifecycle (in the `<script id="meta">` block):**
- At session start: set `currentFocus`.
- At session end: update `lastCompleted`, `lastUpdated`, set `nextUp`, clear `currentFocus`.

## Do NOT log
- Trivial typo fixes
- Pure formatting / whitespace
- Internal refactors that don't change observable behavior
- Experimental changes that get reverted in the same session

## Editing protocol
- Use `str_replace` between section markers — never rewrite the whole file.
- Always bump `data-updated="YYYY-MM-DD"` on the affected section/element if the attribute exists.
- Always update the meta block's `lastUpdated` when any section changes.

## Screenshots
Re-run `node take-screenshots.mjs` after notable UI changes. Then update the captured-date captions in `claude:design:screenshots`.

## Wishlist intake
When the user asks for a feature you can't build right now, add it to `claude:wishlist` with priority (high/medium/low) and date.
