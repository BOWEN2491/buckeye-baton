import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { handle } from '../src/server/api';
import { closeDatabase, database } from '../src/server/db';
import { confirmedTopics } from './p5-helpers';
import { startInvitationRunner, stopInvitationRunner } from '../src/server/invitation-runner';

// Regressions for docs/P4_REVIEW.md R1 and R3 (P4 review of 7b8a629).
async function request(resource: string, id?: string, method = 'GET', user?: string, body?: unknown, query = '') {
 const req = new Request(`http://localhost/api/${resource}${query}`, { method, headers: { ...(user ? { 'x-demo-user-id': user } : {}), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
 const response = await handle(req, resource, id); return { status: response.status, ...await response.json() };
}
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('P4 R1: Unread lists only effectively unread items, filtered before the page boundary', async () => {
 process.env.DATABASE_MODE = 'pglite'; process.env.PGLITE_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'buckeye-baton-p4-r1-'));
 try {
  const db = await database();
  await confirmedTopics(db, 'project-v2-paused', ['front-end']);
  const future = new Date(Date.now() + 5 * 864e5).toISOString(), past = new Date(Date.now() - 864e5).toISOString();
  const activity = (id: string, createdAt: string) => db.query(`INSERT INTO inbox_items (id,"recipientId",kind,"eventKey",event,"actorId","projectId","createdAt") VALUES ($1,'student-mia','activity',$2,'question_created','student-alex','project-signup',$3)`, [id, `question:r1-${id}`, createdAt]);
  const invite = (id: string, projectId: string, status: string, expiresAt: string, createdAt: string) => db.query(`INSERT INTO inbox_items (id,"recipientId",kind,"eventKey","projectId","invitationKind",status,"cycleKey","matchedTags",evidence,"expiresAt","createdAt") VALUES ($1,'student-mia','invitation',$2,$3,'pickup',$4,$3,'[]','[]',$5,$6)`, [id, `invite:pickup:r1-${id}`, projectId, status, expiresAt, createdAt]);
  // Oldest: two real unread Activity items in the same microsecond.
  await activity('a0', '2030-01-01T00:00:00.000100Z'); await activity('a1', '2030-01-01T00:00:00.000100Z');
  // Then 60 invalid unread invitations (more than one scan batch): persisted cancelled, past expiry, and
  // pending-but-ineligible (project-events is Ongoing, so a pickup invitation is effectively cancelled).
  for (let i = 0; i < 60; i++) {
   const kind = i % 3;
   await invite(`x${String(i).padStart(2, '0')}`, kind === 2 ? 'project-events' : 'project-v2-paused', kind === 0 ? 'cancelled' : 'pending', kind === 1 ? past : future, new Date(Date.parse('2030-01-01T00:01:00Z') + i * 1000).toISOString());
  }
  // One valid pending invitation (project-v2-paused is Paused with no successor) and the newest Activity.
  await invite('valid', 'project-v2-paused', 'pending', future, '2030-01-01T00:02:30.000000Z');
  await activity('a2', '2030-01-01T00:03:00.000000Z');
  const snapshot = async () => (await db.query('SELECT * FROM inbox_items ORDER BY id')).rows;
  const before = await snapshot();
  const seen: string[] = []; let cursor = ''; let counts: number[] = [];
  for (let i = 0; i < 10; i++) {
   const page = (await request('inbox', undefined, 'GET', 'student-mia', undefined, `?filter=unread&limit=2${cursor ? `&cursor=${cursor}` : ''}`)).data;
   seen.push(...page.items.map((x: any) => x.id)); counts.push(page.unreadCount);
   assert.ok(page.items.every((x: any) => x.kind === 'activity' || x.status === 'pending'));
   if (!page.nextCursor) break; cursor = page.nextCursor;
  }
  assert.deepEqual(seen, ['a2', 'valid', 'a1', 'a0']);
  assert.ok(counts.every(c => c === 4)); // same semantics as unreadCount
  // History stays in All / Invitations.
  const all = (await request('inbox', undefined, 'GET', 'student-mia', undefined, '?filter=invitations&limit=50')).data;
  assert.equal(all.items.length, 50); assert.ok(all.nextCursor);
  assert.ok(all.items.some((x: any) => x.status === 'cancelled') && all.items.some((x: any) => x.status === 'expired'));
  assert.deepEqual(await snapshot(), before); // GET never writes
  assert.equal((await request('inbox', undefined, 'GET', 'student-mia', undefined, '?filter=unread&cursor=missing')).status, 400);
 } finally { await closeDatabase(); }
});

test('P4 R3: a failed database start does not stop the runner; it recovers and records the outage', async () => {
 const env = { mode: process.env.DATABASE_MODE, dir: process.env.PGLITE_DATA_DIR };
 const unhandled: unknown[] = [];
 const onUnhandled = (reason: unknown) => unhandled.push(reason);
 process.on('unhandledRejection', onUnhandled);
 try {
  await closeDatabase();
  process.env.DATABASE_MODE = 'unavailable-for-test'; // database() rejects: neither pglite nor configured postgres
  startInvitationRunner(20);
  await wait(120); // several failed checks
  assert.equal((globalThis as any).buckeyeInvitationRunner?.started, true);
  process.env.DATABASE_MODE = 'pglite'; process.env.PGLITE_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'buckeye-baton-p4-r3-'));
  let status: any = null;
  for (let i = 0; i < 100 && !status?.lastCompletedAt; i++) { await wait(50); status = (await request('invitationStatus', undefined, 'GET', 'staff-kevin')).data; }
  stopInvitationRunner();
  assert.ok(status?.lastCompletedAt, 'recovered automatically after storage became available');
  assert.ok(status.lastFailureAt, 'the outage is recorded once storage is reachable');
  assert.equal(status.error, null);
  assert.ok(Date.parse(status.lastFailureAt) <= Date.parse(status.lastCompletedAt));
  assert.deepEqual(unhandled, []);
 } finally {
  stopInvitationRunner();
  process.off('unhandledRejection', onUnhandled);
  process.env.DATABASE_MODE = env.mode ?? 'pglite'; if (env.dir) process.env.PGLITE_DATA_DIR = env.dir;
  await closeDatabase();
 }
});

test('P4 R3: a check that rejects keeps the interval; stopping during a check prevents rescheduling', async () => {
 const unhandled: unknown[] = [];
 const onUnhandled = (reason: unknown) => unhandled.push(reason);
 process.on('unhandledRejection', onUnhandled);
 try {
  let runs = 0, active = 0, maxActive = 0;
  startInvitationRunner(15, async () => {
   runs++; active++; maxActive = Math.max(maxActive, active);
   try { await wait(5); if (runs <= 2) throw new Error('injected check failure'); } finally { active--; }
  });
  await wait(200);
  stopInvitationRunner();
  assert.ok(runs >= 4, `kept running after failures (${runs})`); assert.equal(maxActive, 1);
  // Stop while a check is in progress: no further check is scheduled.
  let during = 0; let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  startInvitationRunner(10, async () => { during++; await gate; throw new Error('fails after stop'); });
  await wait(20);
  stopInvitationRunner();
  release();
  await wait(80);
  assert.equal(during, 1);
  assert.equal((globalThis as any).buckeyeInvitationRunner, undefined);
  // A later start works normally (the earlier failure left no stuck started flag).
  let later = 0;
  startInvitationRunner(10, async () => { later++; });
  await wait(60);
  stopInvitationRunner();
  assert.ok(later >= 2);
  assert.deepEqual(unhandled, []);
 } finally { stopInvitationRunner(); process.off('unhandledRejection', onUnhandled); }
});
