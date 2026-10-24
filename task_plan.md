# HackOHI/O preparation — 2026-10-22

Goal: prepare a local, generic development rehearsal in D:\HackOHIO_1024 and identify remaining manual account/event tasks. Competition business features are out of scope.

## Phases
1. Environment and official-rule checks — complete.
2. Isolated Python environment and dependency installation — complete.
3. React ↔ FastAPI rehearsal, launch scripts, optional API check and Streamlit fallback — complete.
4. Build, HTTP and rendered-browser validation — complete.
5. Chinese handoff, teammate exercise and manual checklist — complete.
6. Connect user-created BOWEN2491/Hacking1024 repository, update exact setup instructions, push and verify — complete (2026-10-23).
7. Add persistent project docs and new-chat entry points, verify and sync — complete (2026-10-23).

## Constraints
- API success already reported by user; no key visible in agent process.
- Never print, persist or commit real credentials.
- No paid deployment, account changes or messages. The user requested setup of their new GitHub repository on 2026-10-23, authorizing upload of the preparation code to BOWEN2491/Hacking1024.
- Disclose all preparation code as prior work if reused during the event.
- Use explicit project Python; leave Miniconda base and global PATH alone.

## Errors
- Official hack.osu.edu/2026 page returned 403 via web fetch; rules and event overview read from official event Devpost pages instead.
- Documentation capture found existing listeners on 8000/5173; health checks confirmed the intended rehearsal, so existing services were reused without stopping them.
- Marker validation initially assumed 29 sections; corrected the validator to compare against the supplied template, which contains 28 required pairs. All pairs are present and balanced.
