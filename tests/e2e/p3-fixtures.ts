// Runs before `next start` in Playwright only: adds fictional rows with dates relative to now into the
// isolated e2e database, so priority rules can be shown without waiting days. Production seeds are unchanged.
import { closeDatabase, database } from '../../src/server/db';

const day = 24 * 3_600_000;
const ago = (days: number) => new Date(Date.now() - days * day).toISOString();
async function main() {
  if (process.env.DATABASE_MODE !== 'pglite' || !process.env.PGLITE_DATA_DIR?.includes('e2e')) throw new Error('P3 fixtures only run against the isolated e2e PGlite database.');
  const db = await database();
  const reflection = { progress: 'A fictional map of three library floors works locally.', outcomes: [], problems: [], nextTeam: '', whyPaused: 'Fictional demo: the team could not get room availability data in time.', ifAgain: ['Ask the library for an official export before building a scraper.'], reusable: [{ label: 'Floor map component', url: null }] };
  await db.query('INSERT INTO projects (id,"ownerId",title,summary,"courseOrClub",term,tags,status,reflection,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) ON CONFLICT (id) DO NOTHING',
    ['p3-old-paused', 'student-alex', 'Study Room Finder Pilot', 'Fictional demo: a paused page showing which campus study rooms are free.', 'Student Innovation Club', 'Spring 2026', JSON.stringify(['maps', 'web']), 'paused', JSON.stringify(reflection), ago(40)]);
  await db.query('INSERT INTO project_questions (id,"projectId","authorId",title,body,"wantsMentor","dueAt","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING',
    ['p3-old-question', 'p3-old-paused', 'student-mia', 'How fresh must room data be before students trust it?', 'Fictional demo question.', true, null, ago(10)]);
  await closeDatabase();
  console.log('P3 e2e fixtures ready');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
