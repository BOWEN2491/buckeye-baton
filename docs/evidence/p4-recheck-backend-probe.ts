import { writeFile, mkdir } from 'node:fs/promises';
import { database, closeDatabase } from '../../src/server/db';
import { handle } from '../../src/server/api';
import { startInvitationRunner, stopInvitationRunner } from '../../src/server/invitation-runner';
import { setInvitationClock } from '../../src/server/invitations';

async function main() {
 await mkdir('.review', {recursive:true});
 process.env.DATABASE_MODE = 'unconfigured'; delete process.env.DATABASE_URL;
 const unhandled: string[] = [];
 process.on('unhandledRejection', e => { unhandled.push((e as Error).message); });
 startInvitationRunner(20);
 await new Promise(r => setTimeout(r,100));
 process.env.DATABASE_MODE = 'pglite'; process.env.PGLITE_DATA_DIR='memory://';
 const db = await database();
 await new Promise(r => setTimeout(r,100));
 const state = (await db.query(`SELECT * FROM invitation_dispatch_state WHERE id='singleton'`)).rows[0];
 const runner = { unhandled, timerScheduled: !!(globalThis as any).buckeyeInvitationRunner?.timer, started: (globalThis as any).buckeyeInvitationRunner?.started, lastCompletedAt: state.lastCompletedAt };
 stopInvitationRunner();
 const now = new Date('2027-05-20T00:00:00Z'); setInvitationClock(()=>now);
 for(const [id,status] of [['review-cancelled','cancelled'],['review-expired','pending']]) {
  await db.query(`INSERT INTO inbox_items (id,"recipientId",kind,"eventKey","projectId","invitationKind",status,"cycleKey","expiresAt") VALUES ($1,'student-mia','invitation',$1,'project-signup','pickup',$2,'project-signup','2027-05-01T00:00:00Z')`,[id,status]);
 }
 const response = await handle(new Request('http://localhost/api/inbox?filter=unread',{headers:{'x-demo-user-id':'student-mia'}}),'inbox');
 const result = await response.json();
 const filter = { status:response.status, unreadCount:result.data.unreadCount, items:result.data.items.map((i:any)=>({id:i.id,status:i.status,readAt:i.readAt})) };
 const output={runner,filter}; console.log(JSON.stringify(output,null,2));
 await writeFile('.review/backend-probes-fixed.json',JSON.stringify(output,null,2));
 setInvitationClock(null);await closeDatabase();
}
main().catch(e=>{console.error(e);process.exitCode=1;});
