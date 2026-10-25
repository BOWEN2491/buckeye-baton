import assert from 'node:assert/strict';
import type { Sql } from '../src/server/db';
import { insert, rows, validateProject } from '../src/server/http';
import { lockDispatch, notify } from '../src/server/inbox';
import { threads } from '../src/server/relay';
import { emptyReflection, questionInput, postInput } from '../src/server/validation';
import type { User } from '../src/shared/types';
import type { RecipientReason } from '../src/shared/p4-types';
import type { Expertise, ExpertiseScores, Technology } from '../src/shared/p5-types';
import { EXPERTISE } from '../src/shared/p5-types';
import { sourceHash, hashSource, questionSource } from '../src/server/recommendations';
import { repositoryHash, type SourceSnapshot } from '../src/server/github';

export const batch = 'sim-20261025';
const day = 86_400_000;
export const pid = (n: number) => `${batch}-project-${String(n).padStart(2, '0')}`;
export const qid = (n: number) => `${batch}-question-${String(n).padStart(2, '0')}`;
export const mid = (n: number) => `${batch}-mentor-${n}`;
const postId = (n: number) => `${batch}-post-${String(n).padStart(2, '0')}`;
const refId = (n: number) => `${batch}-referral-${n}`;
export const mentors: User[] = [
 { id: mid(1), name: 'Emma Chen', role: 'mentor', headline: 'Fictional simulation mentor · frontend and accessibility', tags: [], expertise: ['front-end', 'brainstorming'] },
 { id: mid(2), name: 'Daniel Brooks', role: 'mentor', headline: 'Fictional simulation mentor · Java backend', tags: [], expertise: ['back-end'] },
 { id: mid(3), name: 'Priya Shah', role: 'mentor', headline: 'Fictional simulation mentor · Python and data', tags: [], expertise: ['algorithm', 'database'] },
 { id: mid(4), name: 'Lucas Reed', role: 'mentor', headline: 'Fictional simulation mentor · databases', tags: [], expertise: ['database'] },
];
// Name, specific goal, author tags. All claims below are explicitly fictional.
const topics: [string, string, string[]][] = [
 ['Campus Event Queue', 'Help volunteers check event attendees in without duplicate entries.', ['java', 'web', 'events']],
 ['Accessible Study Planner', 'Make weekly study tasks usable with keyboard navigation.', ['react', 'web', 'accessibility']],
 ['Library Seat Map', 'Show study-seat availability and the age of each observation.', ['python', 'data', 'maps']],
 ['Volunteer Shift Board', 'Coordinate shift changes without losing signup history.', ['java', 'database', 'volunteering']],
 ['Club Budget Ledger', 'Track approved expenses with an auditable transaction history.', ['postgresql', 'database', 'web']],
 ['Library Map Reproduction', 'Reproduce the library map with a smaller, clearly labelled dataset.', ['maps', 'web']],
 ['Volunteer Route Continuation', 'Continue the unfinished volunteer route planner.', ['python', 'maps', 'volunteering']],
 ['Event Form Accessibility Upgrade', 'Improve keyboard focus and validation on a completed signup flow.', ['react', 'web', 'accessibility']],
 ['Library Floor Map', 'Publish a static, accessible map of a single library floor.', ['maps', 'web']],
 ['Meal Donation Tracker', 'Track donation handoffs between campus volunteers.', ['java', 'database', 'volunteering']],
 ['Keyboard Friendly Event Form', 'Build a signup form that clearly explains validation errors.', ['react', 'web', 'accessibility']],
 ['Study Group Matcher', 'Match study groups using opt-in course and schedule preferences.', ['python', 'data', 'web']],
 ['Club Attendance Export', 'Export consistent event attendance records without duplicate rows.', ['postgresql', 'database', 'events']],
 ['Campus Recycling Guide', 'Present searchable, plain-language recycling guidance.', ['react', 'web', 'data']],
 ['Quiet Space Directory', 'Collect accessible quiet-space descriptions and map locations.', ['maps', 'web', 'accessibility']],
 ['Volunteer Route Planner', 'Group volunteer pickup locations into short walking routes.', ['python', 'maps', 'volunteering']],
 ['Room Sensor Dashboard', 'Distinguish missing room sensor readings from empty rooms.', ['python', 'data', 'maps']],
 ['Club Inventory Checkout', 'Prevent two people checking out the same club equipment.', ['java', 'database', 'web']],
 ['Campus Bus Notes', 'Show rider notes alongside data freshness indicators.', ['maps', 'web', 'data']],
 ['Event Photo Consent', 'Explain consent choices before collecting event photos.', ['react', 'web', 'accessibility']],
];
const ages = [14,12,10,8,6,3,2,1,56,49,42,35,28,21,56,42,35,21,14,7];
const questionProjects = [1,2,3,4,5,9,10,11,12,13,14,15,16,17,18,19,20];
const prompts = [
 ['How should we prevent duplicate submissions?', 'Two volunteers may submit the same action. What should identify a repeated request?', 'Use a stable request identifier and enforce uniqueness in storage. Show the original result on retry.'],
 ['How can keyboard users recover from an error?', 'Focus stays at the top after validation. Which field should receive focus?', 'Move focus to a concise error summary and link each error to its field. Preserve the entered values.'],
 ['How should stale data be labelled?', 'Students may read an old observation as live availability. How should we show the observation time?', 'Show when the data was observed and a clear stale label. Missing data should not imply availability.'],
 ['What belongs in the handoff checklist?', 'The next team needs a small starting point. Which assumptions and materials should we document?', 'Record the smallest reproducible flow, known limits and a concrete next task before extending scope.'],
 ['How do we keep the database history consistent?', 'Editing an entry may lose the original action. What should be preserved for the next team?', 'Keep an audit record and validate related changes in one transaction. Test retries with the same input.'],
];

function fixture(now: Date) {
 const projects = topics.map(([name, goal, tags], i) => {
  const n = i + 1;
  const status = n <= 8 ? 'ongoing' : n <= 14 ? 'finished' : 'paused';
  const reflection = { ...emptyReflection(), progress: `Fictional simulation: ${goal} A small local prototype is available.` };
  if (status === 'finished') Object.assign(reflection, {
   outcomes: [`Fictional simulation outcome: a small working prototype for ${name.toLowerCase()}.`],
   nextTeam: 'Reproduce the smallest flow with your own data, then test the assumptions below.',
   problems: [{ title: 'An assumption did not hold', assumed: 'We assumed a single user would complete the flow without interruption.', happened: 'Fictional rehearsal: a retry produced confusing feedback.', changed: 'We preserved input and made the confirmation state explicit.' }],
  });
  if (status === 'paused') Object.assign(reflection, {
   whyPaused: 'Fictional simulation: the team paused before validating the data source and narrowing the next milestone.',
   ifAgain: ['Confirm access to a small sample first.', 'Choose one end-to-end task for the next team.'],
   reusable: [{ label: 'Local prototype and handoff checklist (not uploaded)', url: null }],
  });
  const input = validateProject({ title: `[Simulation] ${name}`, summary: `Fictional product simulation. ${goal}`, courseOrClub: 'OSU Product Simulation · fictional', term: 'Autumn 2026', tags: [], status, reflection, codeUrl: `https://github.com/buckeye-baton-simulation/project-${String(n).padStart(2, '0')}`, demoUrl: null });
  const createdAt = new Date(now.getTime() - ages[i] * day).toISOString();
  return { ...input, id: pid(n), ownerId: n % 2 ? 'student-alex' : 'student-mia', createdAt, updatedAt: createdAt };
 });
 const questions = Array.from({ length: 30 }, (_, i) => {
  const n = i + 1, project = projects[questionProjects[i % questionProjects.length] - 1];
  const prompt = prompts[i % prompts.length];
  return { id: qid(n), projectId: project.id, authorId: project.ownerId === 'student-alex' ? 'student-mia' : 'student-alex',
   ...questionInput.parse({ title: `[Simulation Q${n}] ${prompt[0]}`, body: `Fictional simulation. ${prompt[1]}`, wantsMentor: n > 6, dueAt: null }),
   createdAt: new Date(Date.parse(project.createdAt) + day + i * 60_000).toISOString() };
 });
 return { projects, questions };
}

interface Storage extends Sql { transaction<T>(fn: (sql: Sql) => Promise<T>): Promise<T> }
export async function importSimulation(db: Storage, now = new Date()) {
 return db.transaction(async sql => {
  await lockDispatch(sql);
  const { projects, questions } = fixture(now);
  const expected: [string, string[], string?][] = [
   ['users', mentors.map(m => m.id)], ['projects', projects.map(p => p.id)], ['project_questions', questions.map(q => q.id)],
   ['project_posts', Array.from({ length: 60 }, (_, i) => postId(i + 1))],
   ['project_referrals', Array.from({ length: 16 }, (_, i) => refId(i + 15))],
   ['project_relations', [1,2,3].map(n => `${batch}-relation-${n}`)],
   ['project_introductions', projects.map(p => p.id), 'projectId'],
   ['question_analyses', questions.filter(q => q.wantsMentor).map(q => q.id), 'questionId'],
   ['ai_jobs', [...projects.map(p => `${batch}-ai-${p.id}`), ...questions.filter(q => q.wantsMentor).map(q => `${batch}-ai-${q.id}`)]],
   ['github_source_cache', projects.map(p => p.codeUrl!), 'repoUrl'],
  ];
  const presence = await Promise.all(expected.map(async ([table, ids, key = 'id']) => (await rows(sql, `SELECT "${key}" FROM ${table} WHERE "${key}"=ANY($1::text[])`, [ids])).length));
  if (presence.every((n, i) => n === expected[i][1].length)) return { batch, imported: false, message: 'Complete batch already exists; preserved all subsequent edits.' };
  if (presence.some(n => n !== 0)) throw new Error('Partial simulation batch or ID collision. No changes made; inspect before retrying.');
  for (const id of ['student-alex','student-mia','mentor-sarah','staff-kevin']) {
   const u = (await rows(sql, 'SELECT role FROM users WHERE id=$1', [id]))[0];
   assert.equal(u?.role, id.split('-')[0], `Missing expected demo user ${id}`);
  }
  for (const m of mentors) await insert(sql, 'users', m);
  for (const p of projects) await insert(sql, 'projects', p);
  for (const q of questions) {
   await insert(sql, 'project_questions', q);
   await notify(sql, { event: 'question_created', eventKey: `question:${q.id}`, actorId: q.authorId, projectId: q.projectId, questionId: q.id, recipients: [[projects.find(p => p.id === q.projectId)!.ownerId, 'project_owner']] });
   await sql.query('UPDATE inbox_items SET "createdAt"=$2 WHERE "eventKey"=$1', [`question:${q.id}`, q.createdAt]);
  }
  let posts = 0;
  const assignments = new Map<string, string>();
  const eventAt = (q: (typeof questions)[number], hours: number) => new Date(Date.parse(q.createdAt) + hours * 3_600_000).toISOString();
  async function post(q: (typeof questions)[number], authorId: string, kind: 'comment' | 'follow_up' | 'mentor_reply', body: string, hours: number) {
   const id = postId(++posts), mentor = assignments.get(q.id);
   if (kind === 'mentor_reply') assert.equal(authorId, mentor);
   if (kind === 'follow_up') assert.equal(authorId, q.authorId);
   const recipients: [string | undefined, RecipientReason][] = [[projects.find(p => p.id === q.projectId)!.ownerId, 'project_owner'], [q.authorId, 'question_author']];
   if (kind === 'follow_up') recipients.push([mentor, 'assigned_mentor']);
   if (kind === 'mentor_reply') recipients.push(['staff-kevin', 'referring_staff']);
   const createdAt = eventAt(q, hours);
   await insert(sql, 'project_posts', { id, questionId: q.id, authorId, ...postInput.parse({ body: `Fictional simulation: ${body}`, kind }), createdAt });
   await notify(sql, { event: 'post_created', eventKey: `post:${id}`, actorId: authorId, projectId: q.projectId, questionId: q.id, postId: id, recipients });
   await sql.query('UPDATE inbox_items SET "createdAt"=$2 WHERE "eventKey"=$1', [`post:${id}`, createdAt]);
  }
  for (let n = 15; n <= 30; n++) {
   const q = questions[n - 1];
   const mentorId = n <= 18 ? mid(1) : n <= 20 ? mid(2) : n === 21 ? mid(3) : n === 22 ? 'mentor-sarah' : mid((n - 23) % 4 + 1);
   assignments.set(q.id, mentorId);
   const id = refId(n), createdAt = eventAt(q, 1);
   await insert(sql, 'project_referrals', { id, questionId: q.id, staffId: 'staff-kevin', mentorId, reason: 'Fictional simulation referral: this mentor can review the prototype and its next test.', createdAt });
   await notify(sql, { event: 'referral_created', eventKey: `referral:${id}`, actorId: 'staff-kevin', projectId: q.projectId, questionId: q.id, referralId: id, recipients: [[q.authorId, 'question_author'], [mentorId, 'assigned_mentor']] });
   await sql.query('UPDATE inbox_items SET "createdAt"=$2 WHERE "eventKey"=$1', [`referral:${id}`, createdAt]);
   if (n <= 18 || n >= 23) await post(q, mentorId, 'mentor_reply', prompts[(n - 1) % prompts.length][2], 2);
   if (n <= 18) await post(q, q.authorId, 'follow_up', 'We tried the suggested small test. How should we handle a retry after the network reconnects?', 3);
  }
  for (let i = 0; i < 44; i++) {
   const q = questions[i % questions.length];
   const author = i % 11 === 0 ? 'staff-kevin' : q.authorId === 'student-mia' ? 'student-alex' : 'student-mia';
   await post(q, author, 'comment', i < 30 ? 'Please include the smallest reproducible example and explain the data assumptions in the handoff notes.' : 'The narrow first milestone is helpful. Keep the earlier experiment and explain what the next team should check.', 4 + i / 100);
  }
  assert.equal(posts, 60);
  for (const [i, source, child, pickupType] of [[1,9,6,'reproduce'],[2,16,7,'continue'],[3,11,8,'improve']] as const) {
   const p = projects[child - 1];
   await insert(sql, 'project_relations', { id: `${batch}-relation-${i}`, sourceProjectId: pid(source), projectId: p.id, ownerId: p.ownerId, requestId: `00000000-0000-4000-8000-00000000000${i}`, pickupType, title: p.title, goal: p.summary, createdAt: p.createdAt });
  }
  // Deliberate simulation snapshots: no remote repository access, no queued model calls and no
  // claim that these hand-authored labels/scores were generated by GitHub or a real model.
  for (const [i, p] of projects.entries()) {
   const original = topics[i][2];
   const generatedTopics: Expertise[] = original.includes('database') ? ['database', 'back-end'] : original.includes('python') ? ['algorithm', 'database'] : original.includes('java') ? ['back-end', 'database'] : ['front-end'];
   const technologies: Technology[] = original.includes('java') ? ['java'] : original.includes('python') ? ['python'] : original.includes('react') ? ['react', 'typescript'] : original.includes('postgresql') ? ['postgresql'] : [];
   const hash = sourceHash(p);
   const sources: SourceSnapshot['sources'] = { repoUrl: p.codeUrl!, commit: null, readAt: now.toISOString(), files: [], missingREADME: true, evidence: 'simulation' };
   const snapshot: SourceSnapshot = { sources, description: 'Fictional simulation placeholder, no repository read.', languages: [], files: [], cacheOrigin: 'simulation-offline' };
   await insert(sql, 'github_source_cache', { repoUrl: p.codeUrl, snapshot, expiresAt: new Date(now.getTime() + 5 * 60_000).toISOString() });
   const published = { id: `${batch}-draft-${p.id}`, version: 5, sourceHash: hash, repositoryHash: repositoryHash(snapshot), sentences: [p.summary.replace('Fictional product simulation. ', 'Fictional simulation: ')], topics: generatedTopics, technologies, tags: [...generatedTopics, ...technologies], reviewedAt: now.toISOString(), generatedAt: now.toISOString(), model: 'simulation-no-model-call', sources };
   await insert(sql, 'project_introductions', { projectId: p.id, published });
   await insert(sql, 'ai_jobs', { id: `${batch}-ai-${p.id}`, kind: 'project', targetId: p.id, sourceHash: hash, status: 'ready' });
  }
  for (const [i, q] of questions.entries()) {
   if (!q.wantsMentor) continue;
   const weights = [[50,85,50,95,20], [95,35,20,15,65], [70,60,65,90,40], [25,30,20,20,95], [20,85,35,98,25]][i % prompts.length];
   const scores = Object.fromEntries(EXPERTISE.map((domain, index) => [domain, { score: weights[index], reason: `Fictional simulation score: ${domain} relates to this rehearsal question; no model was called.` }])) as ExpertiseScores;
   const hash = hashSource(await questionSource(sql, q.id));
   await insert(sql, 'question_analyses', { questionId: q.id, sourceHash: hash, scores, model: 'simulation-no-model-call' });
   await insert(sql, 'ai_jobs', { id: `${batch}-ai-${q.id}`, kind: 'question', targetId: q.id, sourceHash: hash, status: 'ready' });
  }
  const states = (await threads(sql, 'id=ANY($1::text[])', [questions.map(q => q.id)])).reduce<Record<string, number>>((out, t) => { out[t.state] = (out[t.state] ?? 0) + 1; return out; }, {});
  assert.deepEqual(states, { discussion: 6, needs_referral: 8, awaiting_reply: 8, replied: 8 });
  return { batch, imported: true, projects: 20, mentors: 4, questions: 30, posts: 60, referrals: 16, relations: 3, simulatedIntroductions: 20, simulatedAnalyses: 24, realModelCalls: 0, states };
 });
}
