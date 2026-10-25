# P5 automated verification

All automated AI and GitHub calls use local transports or isolated HTTP mocks. No real API key is read, copied or sent by these suites. Ports 3000/3001 and the preview databases are outside the test setup.

## Coverage

- Existing backend journeys retain ownership, idempotent pickup, post deletion, manual referral, queue counts, exact microsecond priority, Inbox pagination, invitation limits and runner recovery assertions.
- P2 introduction regressions are adapted to durable queued generation and version5 labels: permissions, private draft, owner sentence edit, label tampering rejection, stale publication fallback, replacement-draft conflict, change-during-generation, seven malformed HTTP200 shapes, unsupported labels/evidence, timeout, recovery and persistence.
- P5 expertise tests cover all five strict score keys, invalid ranges and unknown domains, per-Mentor self-edit, max-domain ranking, live workload ties, immediate expertise updates, low relevance, explicit referral, follow-up invalidation/deletion and author-only retry.
- GitHub tests cover canonical root URLs/SSRF rejection, commit-pinned files, source provenance, cache, missingREADME, empty/private/rate-limited repositories, bounded bodies, Unicode-safe truncation and at most two root manifests.
- Durable jobs cover equal-source deduplication,30s/120s retry schedule and retry exhaustion, startup processing recovery and recurring runner exception/stop behavior.
- Review regressions check repository material identity (readAt-only refresh stays valid, changed commit hides public labels and rejects old-tab confirmation) and long failures waiting the full30s/120s from failure time. The browser checks parent detail labels/Sources update immediately after confirmation.
- Browser additions exercise real production-server API calls with local GitHub/model mock servers, read-only generated labels and Sources, private confirmation, stale fallback, profile persistence and Staff's three candidates/manual choice at390px.

## Execution

Node22 with NEXT_TELEMETRY_DISABLED=1. Final results after review fixes: backend26/26 (76.8s), simulation2/2 (9.9s), production browser24/24 (2.6min). Coordinator typecheck and fresh production build passed. Isolated ports3810/3909/3910, temporary PGlite, local GitHub/model mocks only. The first browser case opens no page until the automatic runner completes both its startup and60s checks.

Browser plugin is unavailable in this session; repository Playwright runs the isolated production server and preserves traces/screenshots on failure.

## Limits

PGlite is single-connection. Real PostgreSQL multi-connection contention, multi-instance workers, public GitHub/provider outages and cloud scheduling are not verified by these local mocks. Simulation fixture/import validation is deferred until the core gate passes; mock/simulation provenance is never described as live GitHub evidence.
