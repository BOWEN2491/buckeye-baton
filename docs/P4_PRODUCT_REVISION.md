# P4 product revision — 2026-10-25

User-requested rules supersede the original P4 contract wherever they conflict.

- Removing a project post creates no notification. Existing notifications for that post are hidden from everyone except the user who removed it. The remover can retain an existing “Comment removed” item, without the deleted body. An author removing their own post normally hides all notifications because actors never receive self-notifications.
- The same visibility predicate applies before pagination, to unread counts, and to mark-as-read access (hidden item returns 404). Historical Inbox rows and soft-deleted posts are preserved.
- Automatic invitations are pickup-only: Paused projects shared at least 14 days ago with no successor, matched to students with relevant Finished project experience. Existing opt-out, expiry, limits and permanent deduplication still apply.
- Questions never generate automatic help invitations. Existing help invitations, regardless of status, are hidden and cannot be accepted, ignored or marked read. Pending legacy help invitations settle as cancelled/expired on a runner check. They do not consume pickup invitation quotas.
- The Interested helpers UI is removed. Its compatibility endpoint still enforces Staff access and question existence, then returns an empty list. Database schema and legacy invitation type values remain for history.
- Normal question, referral, mentor reply and follow-up Activity, manual Staff referral, workbenches, priority and AI introductions remain available.

## Validation

Final results and preview identity are recorded below after execution. Browser plugin/browser skill is not available in this session; the repository Playwright suite runs a production server on isolated ports 3240/3340 and a fresh temporary PGlite database. Model regressions use only a local mock. No real AI calls are needed for this revision. Real PostgreSQL/Neon/AWS/public deployment and multi-instance operation are not validated.

## Final checks

- Typecheck: passed. Production build: passed (BuildID zxqkg5OxLuNqffTSgakce).
- Backend: 20/20 passed, including retained notification history, remover-only visibility, unread counts, hidden-item access, retired pending/accepted help history, pickup quotas and manual referral/reply.
- Browser: 23/23 passed on production next start, including pickup-only runner before any page opens, deletion by owner/author, pagination refresh and superseded Load more, identity journey and 390px.
- AI calls: zero real calls for this revision; existing AI regressions used local mock.
- No schema/dependency changes.
