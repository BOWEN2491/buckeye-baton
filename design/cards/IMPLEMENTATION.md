# Project Card: States and Implementation

> **Superseded in part (2026-10-24).** The product is now Buckeye Baton, with Project at the core. All AI features (§6), the Faculty/Staff Connector role name (now **Staff**), and adoption counts are out of scope. See [`../relay/SPEC.md`](../relay/SPEC.md) §1 for the current scope. The section layout per state (§3) still applies as a visual reference.

This folder holds the design and implementation spec for the **project card**, the core UI of Pass It On (candidate direction, see the main plan when merged).

| File | What it shows |
|---|---|
| [`ongoing.html`](ongoing.html) | A project in progress that needs help |
| [`finished.html`](finished.html) | A completed project and the team's reflections |
| [`paused.html`](paused.html) | A project that stopped, and what the next team can learn or reuse |
| `IMPLEMENTATION.md` | This spec |

The HTML files are static mockups. They open directly in a browser, need no server, and support light and dark mode and phone width. All names and numbers in them are sample data.

This spec does not assume a tech stack.

---

## 1. Core idea

There is **one card component**. A project's `status` decides **which sections appear, in what order, and which one is the hero** (the most prominent block).

| Status | Hero (most prominent) | Question the card answers |
|---|---|---|
| **Ongoing** | The student's help request | What does this team need right now? |
| **Finished** | The team's reflections | What did they learn, and what can I take? |
| **Paused** | Why they paused + what to reuse | Why did they stop, and can I continue? |

"Paused" replaces "Failed": students are more willing to publish a project that is paused than one labelled failed. Tagline: *"Didn't ship, but the lessons did."*

---

## 2. Roles

| Role | UI label | Can do on a card |
|---|---|---|
| Student | Student | Create the project, write the help request and reflections, confirm the AI summary, change status, adopt lessons, pick up / continue a project |
| Mentor | Mentor | Reply to a help request, comment on finished or paused projects |
| OSU faculty / staff | **Faculty** | Review the AI category, choose a mentor from AI recommendations, send a referral with a reason; edit and share cards |

> Faculty act as the bridge: they post, edit and share, and connect students with mentors. Mentors mainly help: they reply, give feedback, and post or edit their own content.

---

## 3. Section layout per state

Top to bottom. ★ = hero.

### Ongoing
1. **Header**: status pill, title, team · type · term, "Picked up from …" (if it has a parent project). Top-right: start date.
2. ★ **Help request** ("We need help with"): student's request text, AI category chips (primary + optional secondary), "AI-classified · asked N days ago".
3. **About this project**: AI summary (goal + progress), labelled "AI summary · confirmed by team".
4. **Help in progress**: referral record (staff → mentor, with reason), then mentor replies.
5. **Actions**: `I can help` (mentor), `Refer a mentor` (staff), `Ask a follow-up` (student).

### Finished
1. **Header**: status pill, title, team · type · term, AI summary compressed into one paragraph. Top-right: adoption text.
2. ★ **From the team**:
   - **What we got**: 1–3 bullet points.
   - **Problems we encountered**: each problem is a box with *We assumed / What happened / We changed*, plus its own adoption count at the top right.
   - **For the next team**: one line.
3. **Mentor comment**: with a "Referred by Faculty …" line.
4. **Footer**: "Picked up by …" link(s), primary action `Pick up the baton`.

### Paused
1. **Header**: same as Finished, plus the tagline *"Didn't ship, but the lessons did."*
2. ★ **From the team**:
   - **Why we paused**: one or two sentences, shown larger.
   - **If we did it again**: 1–3 bullet points.
   - **What you can reuse**: 1–4 items, each with a link.
3. **Mentor comment**: with a referral line.
4. **Footer**: "Open to a new team", primary action `Continue this project`.

### Shared rules
- **Adoption count** is always small top-right text: `Adopted by N projects · M worked`. Hidden when N = 0. Never shown on Ongoing cards; those show the start date instead.
- The **AI summary** is never the hero. It shrinks into the header on Finished and Paused.
- The **referral** is its own block only while it is happening (Ongoing). Afterwards it shrinks to one line under the mentor's name.

Suggested implementation: a config map from status to an ordered list of sections, rendered in a loop, instead of three separate card components.

```
SECTIONS = {
  ongoing:  [Header, HelpRequest*, AISummary, HelpInProgress, Actions],
  finished: [Header(withSummary), Reflections*, MentorComment, RelayFooter],
  paused:   [Header(withSummary, tagline), PausedReflections*, MentorComment, ContinueFooter],
}
* = hero
```

---

## 4. Data model

```
Project
  id, title, team_member_ids, type (course | student_org | personal), term
  status            ongoing | finished | paused
  parent_project_id nullable; set by "Pick up the baton" / "Continue this project"
  started_at, status_changed_at

AISummary
  project_id, text, generated_for_status, confirmed_by_team (bool), updated_at

HelpRequest                       (Ongoing; a project can have several, one open at a time)
  id, project_id, author_id, text, created_at
  ai_primary_category, ai_secondary_category (nullable), ai_rationale
  final_primary_category          staff may override the AI
  status                          open | referred | answered | closed

Referral
  id, help_request_id, staff_id
  recommended_mentor_ids          ordered: [top, alt1, alt2, alt3]
  chosen_mentor_id, chosen_rank   0 = top pick; null = picked outside the list
  ai_draft_reason, final_reason, created_at

Reply                              mentor replies on a help request, or comments on a finished/paused project
  id, project_id, help_request_id (nullable), author_id, referral_id (nullable), body, created_at

Reflection (Finished)
  project_id, what_we_got[] (1–3), for_next_team
  problems[]: { id, title, assumed, happened, changed }

PausedReflection (Paused)
  project_id, why_paused, if_again[] (1–3)
  reusable[]: { label, url }

Adoption
  id, source_project_id, problem_id (nullable), adopting_project_id, result (worked | partial | failed), note

MentorProfile
  user_id, title, expertise_categories[], available_this_week (bool)
```

The adoption text is computed from `Adoption` rows: N = distinct adopting projects, M = how many of those reported `worked`.

---

## 5. Status transitions

```
            ┌──── mark finished ───► Finished ── Pick up the baton ──► new Ongoing (parent = this)
Ongoing ────┤
            └──── mark paused ─────► Paused ──── Continue this project ─► new Ongoing (parent = this)
```

| Transition | What the UI asks for | Carried over |
|---|---|---|
| Ongoing → Finished | What we got (≥1), at least 1 problem, For the next team | Mentor replies stay on the project; AI summary is regenerated for Finished, and the team confirms it |
| Ongoing → Paused | Why we paused (required), If we did it again (≥1), What you can reuse (optional) | Same as above |
| Finished → new Ongoing | New project title and team | `parent_project_id`; the parent's "For the next team" is shown as a starting note |
| Paused → new Ongoing | New project title and team | `parent_project_id`; the parent's reusable items are listed as a starting point |

When a status changes, any open help request is closed. A card is never deleted because of a status change.

---

## 6. AI features

AI does three narrow jobs. People always confirm before anything is published or sent.

### 6.1 Project summary
- **Input:** title, team-provided description, status, and (for Finished/Paused) the reflections.
- **Output:** 2–3 sentences. What it focuses on depends on the status:
  - Ongoing: goal + current progress
  - Finished: what was built + outcome
  - Paused: what was tried + where it stopped
- **Rule:** shown as a draft; the team edits or confirms it. Labelled "AI summary · confirmed by team".
- **AI never writes the reflections** (What we got / Problems / Why we paused). Those are only valuable because the team wrote them.

### 6.2 Help request classification
- **Input:** the help request text (main signal) + the project summary (context).
- **Output (JSON):** `{ "primary": <category>, "secondary": <category|null>, "rationale": "<one sentence>" }`
- **Categories:**

| Category | Use when | Example |
|---|---|---|
| Industry & Domain Insight | Unsure about direction, who the users are, whether it's worth doing | "Do clubs actually need a scheduling tool?" |
| Technical Approach | Choosing a solution or architecture before building | "What's a good way to handle real-time data?" |
| Implementation Blocker | Already building and stuck on a concrete problem | "Form submissions fail after deployment" |
| User Research & Validation | How to test, interview users, read results | "How do we find out why testers drop off?" |
| Design & UX | Interface, flow, usability | "The mobile form layout is cramped" |
| Scope & Teamwork | Too much to do, unclear roles, need to cut scope | "Two weeks left, what should we cut?" |

- The Faculty member can override the category. Overrides are stored (`final_primary_category`) and can be used later to improve the prompt.

### 6.3 Mentor recommendation
Ranking is **rule-based, not an LLM**, so it is predictable and easy to explain:

```
score(mentor) =
    0.40 × category_match      1.0 if primary ∈ expertise, 0.5 if only secondary ∈ expertise
  + 0.25 × similar_projects    mentor replied on projects with the same tags / category (normalised)
  + 0.20 × track_record        adoptions of projects the mentor commented on (normalised)
  + 0.15 × available           1.0 if available_this_week
```

- **Output:** the top pick + 3 alternatives. Each comes with 1–3 reason chips taken from the terms that scored, e.g. "Expert in User Research", "Commented on 2 similar projects", "Advice adopted by 3 teams".
- **Relay bonus:** if a member of the parent project's team is a mentor, include them among the alternatives with the reason "Built the original <project>".
- The Faculty member may choose any of the four, or search for someone else.

### 6.4 Referral reason draft
- AI drafts one sentence: why this mentor fits this request.
- The Faculty member edits it before sending. Both `ai_draft_reason` and `final_reason` are stored.

### 6.5 When AI is unavailable
- Summary: the team writes it by hand.
- Classification: the student or staff picks the category from the list of 6.
- Recommendation: still works, because ranking is rule-based.
- Reason: staff writes it by hand.

The demo must not depend on a live AI call. Keep pre-generated outputs in the seed data as a fallback.

---

## 7. Referral flow (Ongoing)

```
Student posts help request
   → AI classifies (primary + secondary)
   → Faculty member opens the referral panel:
       sees the request, the AI category (editable), top pick + 3 alternatives with reasons
   → picks a mentor, edits the AI-drafted reason, sends
   → Mentor is notified; sees request + project summary + staff's reason
   → Mentor replies on the card  → HelpRequest.status = answered
```

The card shows the referral in "Help in progress" while the project is Ongoing. After Finished/Paused, it becomes the "Referred by Faculty …" line under the mentor comment.

---

## 8. Visual spec

| Token | Ongoing | Finished | Paused |
|---|---|---|---|
| Accent | Blue `#0969DA` | Green `#1A7F37` | Orange `#BC4C00` |
| Pill background / text | `#DDF4FF` / `#0550AE` | `#DAFBE1` / `#116329` | `#FFF1E5` / `#9A4A00` |
| Hero background / border | `#F1F8FF` / `#9CD1FF` | `#F2FCF4` / `#8DDB9E` | `#FFF8F2` / `#FFC799` |
| Status dot shape | Circle | Circle | **Square** |

- Neutral colors: ink `#1F2328`, body `#31373D`, muted `#59636E`, line `#D1D9E0`, page `#F6F8FA`. Dark-mode values are in the HTML files.
- Type: IBM Plex Sans (UI), IBM Plex Mono (AI labels only). Title 24px/700, hero text 18px/600 (Ongoing) or 16–17px headings (Finished/Paused), body 14px.
- Card: 12px radius, 1px border, max width ~600px, 24px inner padding (16px at phone width).
- Status is never shown by color alone: the pill always has a text label, and Paused uses a square dot.
- Buttons are at least 44px tall.

---

## 9. Build checklist

- [ ] Data model and seed data for the three sample projects (with a relay chain: Club Sign-up Site → Volunteer Scheduler)
- [ ] Card component driven by the status → sections config
- [ ] Header with the adoption text rule (hidden at 0; start date on Ongoing)
- [ ] Ongoing: help request form + AI classification + chips
- [ ] Referral panel: category override, top pick + 3 alternatives, editable reason, send
- [ ] Mentor reply on the card
- [ ] Status-change forms (→ Finished, → Paused) with required fields
- [ ] Pick up the baton / Continue this project → new Ongoing project with parent link
- [ ] Adopt a problem → Adoption row → counts update
- [ ] AI fallbacks and pre-generated seed outputs for the demo
- [ ] Check at phone width and in dark mode
