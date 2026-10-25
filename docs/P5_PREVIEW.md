# P5 local preview and preserved data

Updated 2026-10-25 (America/New_York). P5 is available for manual product acceptance; it is not merged to `main` and is not deployed publicly.

## Live preview

- URL: **http://127.0.0.1:3001**; health: `http://127.0.0.1:3001/api/health`.
- Running app source SHA: **9093dbba0084dcbe80d2ab1edcca9ce0b8fd8aaa** (`codex/p5-implementation`). Build ID: **SK3X7lRzOfyQcx5XWj9Zd**.
- App/build directory: `C:/Users/23678/.codex/workspaces/buckeye-baton-p5-implementation`.
- Node PID: **19352**; hidden PowerShell launcher PID: **12592**. Confirm the port listener and process command before stopping it; never stop by stale PID alone.
- Health returned `ok`, `databaseMode=pglite`. The existing protected `.env.local` is loaded through Node `--env-file`; the AI-analysis and pickup-invitation runners are enabled. The provider is the existing real OpenAI configuration, not a browser-test mock. P5 automated checks and this simulation import made **zero real model calls**. A manual Generate action can call the configured provider.
- Port3000 remains the original P3 preview (PID **38224**) and was not changed.

## Database and imported simulation

P5 uses the same persistent PGlite directory as the prior 3001 P4 preview: `C:/Users/23678/.codex/workspaces/buckeye-baton-p4-review/.data/p4-preview-e2e-737dae5553fa44779b0d1d0ce0ff3459`. P5 migrations were additive. Before upgrade, the offline database was copied to `C:/Users/23678/.codex/workspaces/buckeye-baton-p4-review/.data/p4-before-p5-upgrade-20261025`; SHA-256 checks matched all **1,047 files**.

After migration, the app was stopped and batch `sim-20261025` was imported in one transaction. The importer compared every preexisting row in 16 tracked tables and confirmed all **4 users, 8 projects, 3 lessons, 1 prior pickup relation, 5 project questions, 5 project posts, 2 project referrals, 2 project introductions and 14 inbox messages**, plus the other tracked tables, remained byte-for-byte/field-for-field unchanged. Full import evidence is in ignored `.data/p5-simulation-import-20261025.json`.

The batch adds **20 projects** (8 ongoing, 6 finished, 6 paused; Alex and Mia own 10 each), **4 Mentors**, **30 questions**, **60 posts**, **16 referrals**, and **3 pickup relations**. All are clearly marked as fictional simulation data. Project links use fictional GitHub URL placeholders: no repository was fetched. The 20 introduction snapshots and 24 question analyses are labeled simulation evidence; they are not represented as real GitHub reads or model output, and import created no pending model work.

Live read-only checks returned 20 projects for `q=Simulation` and the expected four new-Mentor Awaiting reply counts: Emma **4**, Daniel **2**, Priya **1**, Lucas **0**. Sarah has **2** including the simulation addition. Total identities: 8 (original four plus four Mentors).

## Manual acceptance

Follow [P5_MANUAL_ACCEPTANCE.md](P5_MANUAL_ACCEPTANCE.md). To explore the rehearsal data, use Explore search `[Simulation]`; for recommendations use **[Simulation Q7]** as Staff Kevin. The fixtures contain fabricated scores and GitHub sources by design. Avoid pressing Generate on a simulation project unless you first replace its placeholder repository with a real public repository.

The preview is a single sustained Node process with single-connection local PGlite. Real PostgreSQL concurrency, Neon, AWS, public deployment and multi-instance operation remain unverified. Do not open this PGlite directory from another process while the preview is running. Do not rebuild `.next` or merge `main` during manual acceptance.