# Acceptance and demo script

All seed people, projects, and scenarios are fictional. No measured improvement is claimed.

## Setup
Use Node 22, install dependencies, copy `.env.example` to `.env.local`, run `npm run db:setup`, and start the app. Local mode uses persistent PGlite under `.data/pglite`. Hosted mode uses a supplied PostgreSQL URL. Do not open the same local database from multiple application processes.

## Midpoint check
1. Select Mia and open `lesson-fields` from Campus Signup. Ask: “Our volunteer event needs dietary details. Which fields should stay required?”
2. Select Staff Kevin (returns to Explore projects), reopen the lesson through Explore or My workspace, and refer the question to Sarah. Reason: “Sarah has experience designing accessible registration flows.”
3. Select Sarah (returns to Explore projects), reopen the referred lesson through My workspace, and reply: “Keep details essential to participation, explain why you need them, and test optional collection with your event team.”
4. Reload and confirm the question, named introducer/reason, named mentor/reply, and completion remain visible in the original lesson discussion.

## Full journey
1. Select Alex. Publish a small project and lesson; confirm they appear in browsing/search and survive refresh.
2. Complete the midpoint flow on the seeded lesson.
3. As Mia, add `lesson-fields` to Campus Events. Usage total stays zero until a result is reported.
4. Report “Adjusted and worked” (`partial`) with note: “We kept essential participation fields and made dietary details optional, then reviewed the form with our team.”
5. Source lesson shows the adopting project and result. Campus Events shows which lesson it used. Alex sees the downstream contribution.
6. Update the result. Exactly one adoption remains and the total is unchanged.
7. Switch Alex's project from finished to paused and back. Its lessons, comments, referrals, and adoption results remain.

## Negative scenarios
- Missing/unknown demo header cannot mutate. Student cannot refer a question; Staff cannot edit Alex's project; unrelated student cannot edit Alex's lesson.
- A non-mentor referral target, cross-lesson reply, empty result note, invalid result, and unsafe URL are rejected clearly.
- Another mentor cannot complete Sarah's referral. Repeated completion does not create duplicated replies.
- Same-project adoption is rejected; repeated joining does not create duplicate usage.
- Empty search, no comments, no referrals, and no adoption results each have clear UI states.
- Loading, network/storage failure, save success, and save failure are visible; failed forms retain entered content.

## Delivery checks
Run typecheck, backend integration tests, production build and production start. Exercise the browser as all four identities. Confirm persistence after a server restart in local mode. Test hosted database read/write and public URL separately when credentials and hosting rights exist; local success does not imply deployment success.

Final demo: find → ask → introduce → answer → apply → report → see the contribution. Keep the video around three minutes; do not spend it filling every form field.
