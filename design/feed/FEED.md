# Feed (Home Page)

The page people see when they open **Buckeye Baton**. Mockup: [`feed.html`](feed.html) (opens directly in a browser; use the role menu at the top to switch between Student, Mentor and Faculty).

## Design principle: every rung of the Ladder is on one page

The challenge brief describes a ladder: **Look around → Show up → Try something small → Join a project → Give back.** The Feed covers every rung, and each item shows how much time it costs ("Respect everyone's time"). The ladder itself is **not shown in the UI**; it is the rationale for what the Feed contains, and is useful in the pitch.

| Ladder step | Where it lives on the Feed |
|---|---|
| 1. Look around | **Browse**: student project cards, industry insights, office-hours recaps |
| 2. Show up | **Office Hours**: mentor sessions and faculty talks |
| 3. Try something small | **Quick tasks**: feedback on a peer's demo (10 min), one-day challenges |
| 4. Join a project | **Open projects**: 4–6 week projects posted by mentors or faculty with a company team |
| 5. Give back | Finished/Paused project cards (lessons for the next team), mentor recaps |

## Layout

```
┌───────────────────────────────────────────────────────────────┐
│ (Avatar→Profile)  Buckeye Baton  [ Search ............ ]  [Role] [+ New] │
├──────────────────────────────────────────┬────────────────────┤
│ For you  (role-aware)                    │ OFFICE HOURS       │
│                                          │ All · Mentors · Talks│
│ BROWSE                                   │ ─ Tue 27 clinic    │
│ All · Projects · Insights · Join ·       │ ─ Wed 28 talk      │
│ Quick tasks · Needs help                 │ ─ Thu 29 1:1       │
│ ┌ feed item ┐                            │ ─ Fri 30 drop-in   │
│ ┌ feed item ┐  ...                       │ See all · Recaps   │
└──────────────────────────────────────────┴────────────────────┘
```

- **Desktop:** Browse is the main column; Office Hours is a sticky right column, so both are visible without switching.
- **Phone:** the columns stack, and a "Browse | Office Hours" switch at the top jumps between them.
- **Avatar (top-left):** links to the profile page (designed later). The profile is where help given, feedback received and projects shipped add up into a record AI cannot generate.

## Top block: "For you" (changes by role)

| Role | Shows |
|---|---|
| Student | Replies to their help request, office hours matching their request, one small task with its time cost, and "You helped N teams this month" |
| Mentor | Help requests matching their expertise, and a reminder to post a recap after office hours |
| Faculty | Help requests waiting for a referral, and talk RSVPs |

## Feed item types

| Type | Posted by | Content | Main action | Time label |
|---|---|---|---|---|
| Student project (Ongoing / Finished / Paused) | Students | Compact version of the project card: request, top lesson, or why paused | View card / I can help / Refer a mentor | — |
| Industry insight | Mentors | Name, role, company; a title; **at most 3 takeaways**; related projects | — | "3 min read" |
| Office hours recap | Mentors | 2–3 takeaways from a session, so one hour helps more than the people who attended | — | "2 min read" |
| Open project | Mentors or faculty | Problem, team size, mentor time, dates, **"Builds on" earlier projects**, who has joined so far (with majors) | See "Actions per item" | "4–6 weeks" |
| Quick task / one-day challenge | Students, mentors or faculty | Feedback on a peer's demo, or a one-day challenge | Give feedback / Join challenge | "10 min", "~3 hrs" |

Notes:
- Open projects link to earlier Finished/Paused projects, so the next team starts with their lessons. This connects the Feed to the card design.
- Wording avoids job-board language: "Join a team", not "Apply". Insights and talks are about how work is done, not hiring.

## Office Hours

| Type | Host | Format | Action |
|---|---|---|---|
| Mentor session | Mentor or faculty | 1:1, small group, or drop-in; usually 30–60 min | Book / Add to calendar |
| Talk | Faculty (connecting students and company teams) | In person or online; capacity shown | RSVP |

- Each session shows a **help category tag** (the same 6 categories as help requests). A student whose open request matches sees "Matches your request".
- Booking shares the student's project card and open help request with the mentor, so the hour starts with context.
- After a session, the mentor is asked to post a 5-minute recap. It appears in Browse as an "Office hours recap".

## "+ New" menu (by role)

| Student | Mentor | Faculty |
|---|---|---|
| Share a project | Industry insight | Open a project |
| Ask for help | Quick task or challenge | Quick task or challenge |
| | Open a project | Office hours |
| | Office hours | Organize a talk |

## Roles on the Feed

| Role | Purpose | What they do on the Feed |
|---|---|---|
| Student | Learn and build | Join, book, RSVP, give feedback to peers, ask for help |
| Mentor | **Help** | Help projects, give feedback on tasks and challenges, post and edit their own insights, tasks, projects and office hours |
| Faculty | **Bridge** | Post, edit and share anything (projects, tasks, challenges, office hours, talks), refer mentors to help requests |

### Actions per item

| Item | Student | Mentor | Faculty |
|---|---|---|---|
| Open project | Join a team, Save | Help this project, Edit (own) | Edit, Share |
| Ongoing project | View card | I can help | Refer a mentor, Share |
| Industry insight | — | — | Share |
| Quick task (feedback) | Give feedback | Give feedback | Share |
| One-day challenge | Join challenge | Give feedback | Edit, Share with a course |
| Mentor office hours | Book / Add to calendar | Edit (own) | Edit, Share |
| Talk | RSVP | Offer to speak | Edit, Share |

## Ranking (first version)

Simple rules, no recommendation model:
1. Items that match the viewer's open help request category or their project's tags.
2. Open projects with a close join deadline.
3. Newest first.

The "Needs help" filter shows Ongoing projects with an open help request; mentors see these first when the request category matches their expertise.

## Solving the empty room

The first students arrive before many other students do, so the Feed launches with content from mentors and faculty:
- Office hours and talks scheduled before launch.
- Faculty import past class projects as Finished/Paused cards.
- Mentors seed a few insights and one-day challenges.

## Data additions (beyond the card spec)

```
Post            id, type (insight | recap | quick_task | challenge), author_id, title,
                takeaways[] (≤3), related_project_ids[], category, time_cost, created_at
OpenProject     id, posted_by, mentor_id, company_team, problem, team_size,
                mentor_time, start_date, join_by, builds_on_project_ids[]
Session         id, type (mentor | talk), host_id, title, starts_at, ends_at,
                location_or_link, format (1on1 | group | dropin | talk),
                category, capacity, booked_count, recap_post_id
Booking         id, session_id, student_id, project_id, help_request_id (nullable)
```
